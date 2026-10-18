/**
 * PYTHON ULTRA — batch 19: OOP III, protocols and typing of behaviour. Every example
 * was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is the Method Resolution Order (MRO)?`,
    difficulty: "hard",
    seoDescription: `Python MRO from zero: the C3 linearization, __mro__, diamond inheritance, how super() follows the MRO, and why some class hierarchies are rejected.`,
    description: `**Question presented to candidate:**
"When a class inherits from several parents and two of them define the same method, how does Python decide which one runs? Walk me through the MRO, how it is computed, and how \`super()\` uses it."

**What a strong answer should cover:**
- The MRO is the single, ordered list of classes Python searches for an attribute; it is stored in \`Cls.__mro__\` (also \`Cls.mro()\`), and the first class that defines the name wins.
- It is computed with the C3 linearization: a class comes before its parents, the left-to-right order of the bases is kept, every class appears once, and \`object\` is last.
- \`super()\` does not mean "my parent": it means "the next class after this one in the MRO of \`type(self)\`", which is what makes cooperative multiple inheritance (each method calling \`super()\`) run every class in a diamond exactly once.
- Some hierarchies have no consistent order; Python refuses them at class-creation time with \`TypeError: Cannot create a consistent method resolution order (MRO)\`.
- Practical consequences: mixins go to the left of the main base, cooperative \`__init__\` methods take \`**kwargs\` and pass the rest on, and C3 has been the rule since Python 2.3 (still the rule in Python 3).

**Clarifying questions expected:**
- Are we talking about method lookup on instances only, or also about how \`super()\` chains calls?

**Code / implementation expected:** Yes — a diamond hierarchy, its \`__mro__\`, and a \`super()\` chain that shows each class running once.`,
    answer: `**Target Audience:** Python developers who have used inheritance but never had to think about the order of lookup, up to candidates who need to explain C3 and \`super()\` precisely.
**Difficulty:** Hard
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3), with the MRO error message also checked on 3.13.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine you start a new job and have two mentors, Bea and Cal, who were both trained by the same senior engineer, Ana. You ask "how do we deploy?". Bea has her own way, Cal has his own way, and Ana has the original way. Whose advice do you follow? And if Bea's advice ends with "...and for the rest, ask the next person", who is the next person: Ana, or Cal?

You need a fixed rule, written down once, that says *who you ask, in what order, and that you never ask the same person twice*. In Python that rule is the **Method Resolution Order**. Every class carries its own list, computed when the class is created, and every attribute lookup and every \`super()\` call follows it. When you only use single inheritance the list is obvious (child, parent, grandparent). The moment a class has two parents, the order stops being obvious, and that is exactly what interviewers probe.

## 2. The Core Idea: One Ordered List per Class

When you write \`obj.greet()\`, Python does not wander the inheritance tree. It takes the list \`type(obj).__mro__\` and checks each class in order for a \`greet\` in its own \`__dict__\`. The first hit wins. (The full lookup, including instance attributes and descriptors, is in [how attribute lookup works](/interview-question/how-does-attribute-lookup-work-on-a-python-object); the MRO is the class part of it.)

📌 **Interview term: Method Resolution Order (MRO)** — the ordered tuple of classes Python searches for an attribute on a class. You read it with \`Cls.__mro__\` or \`Cls.mro()\`. Despite the name it applies to every class attribute, not just methods.

📌 **Interview term: Multiple inheritance** — a class with more than one base, like \`class D(B, C)\`.

With single inheritance there is nothing to decide. With multiple inheritance, the classic shape is the diamond:

<svg class="iq-diagram" width="100%" viewBox="0 0 560 430" role="img" aria-label="Diamond inheritance: D inherits from B and C, and both B and C inherit from A">
  <defs>
    <marker id="py19q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="200" y="20" width="160" height="70" rx="10"/>
  <text class="d-text" x="280" y="50" text-anchor="middle">A</text>
  <text class="d-sub" x="280" y="72" text-anchor="middle">defines greet</text>
  <rect class="d-box" x="30" y="180" width="160" height="70" rx="10"/>
  <text class="d-text" x="110" y="210" text-anchor="middle">B(A)</text>
  <text class="d-sub" x="110" y="232" text-anchor="middle">overrides greet</text>
  <rect class="d-box" x="370" y="180" width="160" height="70" rx="10"/>
  <text class="d-text" x="450" y="210" text-anchor="middle">C(A)</text>
  <text class="d-sub" x="450" y="232" text-anchor="middle">overrides greet</text>
  <rect class="d-box-accent" x="200" y="340" width="160" height="70" rx="10"/>
  <text class="d-text" x="280" y="370" text-anchor="middle">D(B, C)</text>
  <text class="d-sub" x="280" y="392" text-anchor="middle">which greet runs</text>
  <path class="d-edge" d="M 250 336 L 150 258" marker-end="url(#py19q1-arrow)"/>
  <path class="d-edge" d="M 310 336 L 410 258" marker-end="url(#py19q1-arrow)"/>
  <path class="d-edge" d="M 130 176 L 236 98" marker-end="url(#py19q1-arrow)"/>
  <path class="d-edge" d="M 430 176 L 324 98" marker-end="url(#py19q1-arrow)"/>
</svg>

\`D\` inherits from \`B\` and \`C\`, and both of them inherit from \`A\`. Arrows point from a class to its parent.

📌 **Interview term: Diamond problem** — when two parents share an ancestor, which version of a method wins, and does the shared ancestor run once or twice?

Python answers with one straight line. For the diamond above, our run printed \`['D', 'B', 'C', 'A', 'object']\`:

<svg class="iq-diagram" width="100%" viewBox="0 0 970 156" role="img" aria-label="The MRO of D is one straight line: D, then B, then C, then A, then object">
  <defs>
    <marker id="py19q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="130" height="76" rx="10"/>
  <text class="d-text" x="85" y="72" text-anchor="middle">D</text>
  <text class="d-sub" x="85" y="96" text-anchor="middle">searched first</text>
  <path class="d-edge-accent" d="M 158 88 L 210 88" marker-end="url(#py19q1-arrow2)"/>
  <text class="d-sub d-accent" x="184" y="72" text-anchor="middle">next</text>
  <rect class="d-box" x="220" y="40" width="130" height="76" rx="10"/>
  <text class="d-text" x="285" y="72" text-anchor="middle">B</text>
  <text class="d-sub" x="285" y="96" text-anchor="middle">first base</text>
  <path class="d-edge-accent" d="M 358 88 L 410 88" marker-end="url(#py19q1-arrow2)"/>
  <text class="d-sub d-accent" x="384" y="72" text-anchor="middle">next</text>
  <rect class="d-box" x="420" y="40" width="130" height="76" rx="10"/>
  <text class="d-text" x="485" y="72" text-anchor="middle">C</text>
  <text class="d-sub" x="485" y="96" text-anchor="middle">second base</text>
  <path class="d-edge-accent" d="M 558 88 L 610 88" marker-end="url(#py19q1-arrow2)"/>
  <text class="d-sub d-accent" x="584" y="72" text-anchor="middle">next</text>
  <rect class="d-box-muted" x="620" y="40" width="130" height="76" rx="10"/>
  <text class="d-text" x="685" y="72" text-anchor="middle">A</text>
  <text class="d-sub" x="685" y="96" text-anchor="middle">shared parent</text>
  <path class="d-edge-accent" d="M 758 88 L 810 88" marker-end="url(#py19q1-arrow2)"/>
  <text class="d-sub d-accent" x="784" y="72" text-anchor="middle">next</text>
  <rect class="d-box-muted" x="820" y="40" width="130" height="76" rx="10"/>
  <text class="d-text" x="885" y="72" text-anchor="middle">object</text>
  <text class="d-sub" x="885" y="96" text-anchor="middle">always last</text>
</svg>

Two things to notice: the bases appear in the order you wrote them (\`B\` before \`C\`), and \`A\` waits until *both* of its children have been visited. Plain depth-first search would have given \`D, B, A, C, A\` — visiting \`A\` before \`C\`, and twice. Example 2 prints both orders side by side.

## 3. How the Order Is Computed: C3 Linearization

📌 **Interview term: C3 linearization** — the algorithm that builds the MRO. It came from the Dylan language community and was adopted in Python 2.3 after Samuele Pedroni showed that the 2.2 algorithm was not monotonic; it is still the rule in Python 3, per [The Python 2.3 Method Resolution Order](https://docs.python.org/3/howto/mro.html) by Michele Simionato in the official docs.

The rule fits on one line. For \`class C(B1, B2, ..., Bn)\`:

~~~text
L[C] = C + merge(L[B1], L[B2], ..., L[Bn], [B1, B2, ..., Bn])
~~~

and \`merge\` repeats this step until every list is empty:

1. Look at the first element (the **head**) of each list, left to right.
2. Take the first head that does **not** appear in the *tail* (anything after position 0) of any list.
3. Append it to the result and remove it from the front of every list where it is the head.
4. If no head qualifies, there is no valid order: raise \`TypeError\`.

Worked by hand for the diamond:

~~~text
L[A] = [A, object]
L[B] = [B, A, object]
L[C] = [C, A, object]
L[D] = D + merge([B, A, object], [C, A, object], [B, C])
     = D, B   + merge([A, object], [C, A, object], [C])      B is no tail: take it
     = D, B, C + merge([A, object], [A, object])             A is in the tail of [C, A, object]: skip; C is fine
     = D, B, C, A, object
~~~

The skip of \`A\` in the second step is the whole trick: \`A\` cannot be taken while some list still has it *behind* another class.

C3 guarantees three properties, which are what you should name in an interview:

- **Children before parents.** A class always comes before every one of its bases.
- 📌 **Interview term: Local precedence order** — the bases keep the order you wrote them in: \`class D(B, C)\` means \`B\` is searched before \`C\`.
- 📌 **Interview term: Monotonicity** — if \`X\` comes before \`Y\` in a parent's MRO, it comes before \`Y\` in every subclass's MRO too. Adding a subclass never reshuffles its ancestors.

Example 1 contains a 20-line \`c3()\` function that implements exactly this merge and checks it against CPython for the diamond and for the larger example from the C3 essay; both comparisons print \`True\`.

## 4. \`super()\` Follows the MRO, Not "the Parent"

This is where most candidates slip. \`super()\` does not mean "my base class". Inside a method defined in class \`K\`, \`super()\` means: *take the MRO of \`type(self)\`, find \`K\` in it, and continue the search from the class right after \`K\`*.

📌 **Interview term: super()** — a proxy object that resumes attribute lookup at the class after the current one in \`type(self).__mro__\`. The zero-argument form \`super()\` is shorthand for \`super(K, self)\`; CPython fills \`K\` in from a hidden \`__class__\` cell the compiler creates for methods that mention \`super\`.

So in the diamond, \`B.greet\` calls \`super().greet()\`:

- on a \`B\` instance, the MRO is \`B, A, object\`, so the next class is \`A\`;
- on a \`D\` instance, the MRO is \`D, B, C, A, object\`, so the next class is **\`C\`**.

Same source code, different target. That is why our run of \`D().greet()\` printed \`['D', 'B', 'C', 'A']\`: every class ran once, and \`A\` ran last.

📌 **Interview term: Cooperative multiple inheritance** — the design where every class in a hierarchy calls \`super()\` for the same method, so the call travels down the whole MRO and each class contributes once. It only works if *every* class cooperates; one class that calls \`A.greet(self)\` directly instead of \`super().greet()\` will skip whatever comes between.

The explicit two-argument form makes the mechanics visible. With \`m = Model2()\` whose MRO is \`Model2, Logging, Caching, Base, object\`, Example 2 printed:

~~~text
super(Logging, m).save()  ->  ['Caching', 'Base']
super(Caching, m).save()  ->  ['Base']
~~~

### Cooperative \`__init__\`

\`__init__\` is just a method, so the same rule applies, but each class needs different arguments. The pattern is: take the keyword arguments you own and pass everything else on with \`**kw\`. When the chain reaches the last class before \`object\`, \`kw\` should be empty, because \`object.__init__\` accepts no extra arguments. Example 2's \`Label(colour="red", name="title")\` runs \`Coloured\`, \`Named\` and \`Shape\` once each, and \`Shape\` reports \`leftovers: {}\`. (If \`*args\`/\`**kwargs\` are new to you, see [what *args and **kwargs mean](/interview-question/what-do-args-and-kwargs-mean).)

📌 **Interview term: Mixin** — a small class that adds one behaviour (logging, caching, JSON output) and is designed to be combined through multiple inheritance. Because of local precedence order, you put mixins to the **left** of the main base: \`class View(LoginRequiredMixin, BaseView)\` so the mixin is searched first and its \`super()\` reaches the base. See [what mixins are](/interview-question/what-are-mixins-in-python) and, for when not to use inheritance at all, [composition versus inheritance](/interview-question/what-is-composition-versus-inheritance).

## 5. When There Is No Valid Order

C3 can fail. If \`XY(X, Y)\` says X before Y and \`YX(Y, X)\` says Y before X, then a class inheriting from both cannot honour both rules. Python checks this when the \`class\` statement runs, not later when a method is called. On python3.11 the message printed was:

~~~text
TypeError: Cannot create a consistent method resolution
order (MRO) for bases X, Y
~~~

The line break is part of the 3.11 message; on 3.13 the same error printed on one line. The other common trigger is listing a class before its own subclass, like \`class Bad(object, X)\`: \`object\` must come after \`X\`, which you asked to come after \`object\`.

## 6. What CPython Does

- **When it is computed.** Class creation calls \`mro()\` once and stores the result as the tuple \`__mro__\` (a metaclass whose \`mro()\` printed a line showed exactly one call per \`class\` statement on our 3.11 run). Lookup then just walks that tuple. A metaclass can override \`mro()\` to produce a custom order (rare; see [what a metaclass is](/interview-question/what-is-a-metaclass)).
- **Every class ends in \`object\`.** It is the root of every MRO in Python 3, which is why \`object\` appears last in every list printed on this page.
- **Lookup is cached.** CPython keeps a per-type method cache so repeated lookups do not rescan the tuple every time; it is invalidated when a class in the MRO is modified. This is an implementation detail and does not change the order.
- **\`isinstance\` and \`issubclass\` also use it.** \`issubclass(D, A)\` is essentially "is \`A\` in \`D.__mro__\`", unless an ABC overrides the check (see [abstract base classes and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols)).

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs matched.

**Example 1 — the diamond, \`super()\`, and C3 implemented by hand** prints:

~~~text
['D', 'B', 'C', 'A', 'object']
['D', 'B', 'C', 'A']
True
['AA', 'BB', 'CC', 'DD', 'E', 'F', 'O', 'object']
True
True
P Q
['R', 'P', 'Q', 'object']
~~~

**Example 2 — an impossible MRO, \`super()\` targets that move, and cooperative \`__init__\`** prints:

~~~text
TypeError: Cannot create a consistent method resolution
order (MRO) for bases X, Y
TypeError: Cannot create a consistent method resolution
order (MRO) for bases object, X
['Logging', 'Base']
['Logging', 'Caching', 'Base']
Shape.__init__ leftovers: {}
red title
['Label', 'Coloured', 'Named', 'Shape', 'object']
['Caching', 'Base']
['Base']
depth-first: ['D', 'B', 'A', 'object', 'C', 'A', 'object']
C3 (real):   ['D', 'B', 'C', 'A', 'object']
~~~

**What the output shows:**

- The diamond's MRO is \`D, B, C, A, object\`, and the \`super()\` chain visits each class once in that order.
- The hand-written \`c3()\` agrees with CPython on both hierarchies, including the eight-class example (\`AA, BB, CC, DD, E, F, O, object\`).
- \`R(P, Q)\` and \`S(Q, P)\` get different \`colour\` values only because the bases were listed in a different order.
- \`Logging.save\` reached \`Base\` inside \`Model1\` but \`Caching\` inside \`Model2\`: the target of \`super()\` is decided by the object, not by where the code was written.
- Depth-first gives a list with \`A\` and \`object\` twice and \`A\` before \`C\`; C3 does not.

## 8. Edge Cases

- **A class that does not call \`super()\`** breaks the chain for everyone after it in the MRO. In a cooperative hierarchy, every override must call \`super()\`, including the "root" class of your own hierarchy if something might be mixed in after it.
- **Changing \`__bases__\` at run time** recomputes the MRO (a metaclass that logs \`mro()\` showed it being called again when we reassigned \`B.__bases__\`); it is allowed only between compatible layouts and is almost never a good idea.
- **Class attributes, not just methods.** Example 1's \`colour\` shows the MRO decides plain data attributes too.
- **Instances are not in the MRO.** An attribute set on the instance (\`self.x\`) is normally found before a class attribute of the same name; the exception is a data descriptor such as a \`property\` found in the MRO, which wins over the instance \`__dict__\` (see [the descriptor protocol](/interview-question/what-is-the-descriptor-protocol)).

## Common Pitfalls

- **Saying \`super()\` calls the parent.** It calls the next class in \`type(self).__mro__\`; in a diamond that can be a sibling class the author never heard of.
- **Mixing \`super()\` with direct calls like \`Base.__init__(self)\`.** One direct call skips the classes between, and the shared base may run twice or a sibling not at all.
- **Positional arguments in cooperative \`__init__\`.** A class cannot know which class comes next in a future subclass; use keyword arguments and \`**kw\`.
- **Putting the mixin on the right.** \`class View(BaseView, Mixin)\` searches \`BaseView\` first, so the mixin's override never runs if the base defines the same method.
- **Assuming depth-first order.** That was the rule for Python 2 classic classes; Python 3 uses C3 for every class.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The MRO is the ordered list of classes Python searches when it looks up an attribute on a class or instance. It lives in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cls.__mro__</code>; the first class in the list that defines the name wins.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it is built:</strong> <span style="color:#f0e2c8;">CPython computes it with the C3 linearization: the class itself first, then a merge of its parents' MROs that keeps every class before its own parents, keeps the order you wrote the bases in, and lists each class once, ending at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The diamond:</strong> <span style="color:#f0e2c8;">For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class D(B, C)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C</code> both subclassing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code>, the MRO is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">D, B, C, A, object</code>. Depth-first would visit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C</code>; C3 delays <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code> until every class that inherits from it has been visited.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. super():</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code> means the next class after the current one in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(self).__mro__</code>, not the parent. So <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B.greet</code> calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().greet()</code> reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C</code> when the object is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">D</code>. If every method calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code>, each class runs exactly once.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Failure and practice:</strong> <span style="color:#f0e2c8;">If no order satisfies the rules, the class statement raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: Cannot create a consistent method resolution order</code>. In practice: put mixins left of the main base, and let cooperative <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__init__</code> methods take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs</code> and pass the rest on.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__mro__</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mro()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__mro__</code> is the tuple CPython stores on the class and uses for lookup. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mro()</code> is a method on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> that computes the list; it is called once when the class is created (and again if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__bases__</code> is reassigned), and a metaclass can override it to customise the order. Normally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(C.__mro__) == C.mro()</code>, which Example 1 prints as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">super()</code> in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">B</code> call <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">C</code> and not <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">A</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super()</code> looks at the MRO of the actual object, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(self)</code>, and moves one step past the class it was written in. For a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">D</code> instance the MRO is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">D, B, C, A</code>, so the step after <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C</code>. For a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B</code> instance it would be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code>. Example 2 shows the same <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Logging.save</code> reaching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Caching</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Base</code> depending on the subclass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does Python refuse to build an MRO?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When two requirements contradict each other: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class XY(X, Y)</code> says X before Y, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class YX(Y, X)</code> says Y before X, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Broken(XY, YX)</code> cannot satisfy both. Listing a class before its own subclass, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Bad(object, X)</code>, fails too. Both raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> when the class statement runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write a cooperative <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__init__</code> in a diamond?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every class in the chain calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">super().__init__(**kw)</code> after taking the keyword arguments it owns, and the last class before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> receives an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kw</code>. Positional arguments do not work well, because a class cannot know which class comes next in some future subclass.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Was the MRO always C3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Classic classes in Python 2 used plain depth-first, left-to-right search, and the new-style classes of 2.2 used a different algorithm that turned out not to be monotonic. C3 replaced it in Python 2.3 and is still what Python 3 uses, per the official Python 2.3 MRO essay by Michele Simionato.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Method Resolution Order (MRO)** | the ordered list of classes Python searches for an attribute, stored in \`Cls.__mro__\` |
| **Multiple inheritance** | a class with more than one base class, such as \`class D(B, C)\` |
| **Diamond problem** | two parents share a grandparent; the question is in what order, and how often, the shared class is visited |
| **C3 linearization** | the merge algorithm Python uses to compute the MRO; it keeps local precedence order and monotonicity |
| **Local precedence order** | the order in which you list the bases in the class statement; the MRO keeps it |
| **Monotonicity** | if X comes before Y in a parent MRO, X comes before Y in every subclass MRO too |
| **super()** | a proxy that continues the attribute search at the class after the current one in \`type(self).__mro__\` |
| **Cooperative multiple inheritance** | a design where every class calls \`super()\` so each class in the MRO runs once |
| **Mixin** | a small class that adds one behaviour and is meant to be combined with others through multiple inheritance |

---
**Conclusion:** The MRO is the single ordered list of classes Python consults for every attribute lookup on a class, stored in \`__mro__\`. It is computed once, at class creation, with the C3 linearization, which keeps children before parents, keeps the order you listed the bases in, never lists a class twice, and refuses hierarchies where those rules contradict. \`super()\` is defined in terms of that list (the next class after this one, for the actual object), which is what lets cooperative methods in a diamond each run exactly once. Know how to print \`__mro__\`, how to merge a diamond by hand, and why \`super()\` is not "the parent", and you have the whole topic.`,
    examples: [
      { label: `The diamond, super() and C3 implemented by hand`, code: `# The MRO: the one ordered list Python searches for attributes.
class A:
    def greet(self):
        return ["A"]

class B(A):
    def greet(self):
        return ["B"] + super().greet()

class C(A):
    def greet(self):
        return ["C"] + super().greet()

class D(B, C):
    def greet(self):
        return ["D"] + super().greet()

def names(cls):
    return [k.__name__ for k in cls.__mro__]

print(names(D))  # ['D', 'B', 'C', 'A', 'object']
# super() in B moves to C, not to A: A runs once.
print(D().greet())  # ['D', 'B', 'C', 'A']
print(D.mro() == list(D.__mro__))  # True

# C3 by hand: L[C] = C + merge(L[B1], ..., L[Bn], [B1, ..., Bn])
def c3(cls):
    seqs = [c3(b) for b in cls.__bases__] + [list(cls.__bases__)]
    out = [cls]
    while any(seqs):
        for seq in seqs:
            if not seq:
                continue
            head = seq[0]
            # a good head is not in the tail of any list
            if not any(head in s[1:] for s in seqs):
                break
        else:
            raise TypeError("no consistent order")
        out.append(head)
        seqs = [s[1:] if s and s[0] is head else s for s in seqs]
    return out

# A bigger hierarchy, the classic example from the C3 paper
class O: pass
class F(O): pass
class E(O): pass
class DD(O): pass
class CC(DD, F): pass
class BB(DD, E): pass
class AA(BB, CC): pass

print(names(AA))  # ['AA', 'BB', 'CC', 'DD', 'E', 'F', 'O', 'object']
print([k.__name__ for k in c3(AA)] == names(AA))  # True
print([k.__name__ for k in c3(D)] == names(D))  # True

# Attribute lookup walks the same list: first match wins.
class P:
    colour = "P"
class Q:
    colour = "Q"
class R(P, Q):
    pass
class S(Q, P):
    pass
print(R.colour, S.colour)  # P Q
print(names(R))  # ['R', 'P', 'Q', 'object']` },
      { label: `Impossible MROs, moving super() targets, cooperative __init__`, code: `# 1. An order C3 cannot build is a TypeError at class creation.
class X: pass
class Y: pass
class XY(X, Y): pass
class YX(Y, X): pass
try:
    class Broken(XY, YX):
        pass
except TypeError as e:
    print("TypeError:", e)

# Listing a base before its own subclass also fails.
try:
    class Bad(object, X):
        pass
except TypeError as e:
    print("TypeError:", e)

# 2. super() means "next class in the MRO of type(self)",
#    so the same method can call different classes.
class Base:
    def save(self):
        return ["Base"]

class Logging(Base):
    def save(self):
        return ["Logging"] + super().save()

class Caching(Base):
    def save(self):
        return ["Caching"] + super().save()

class Model1(Logging):
    pass

class Model2(Logging, Caching):
    pass

print(Model1().save())
# Logging.save is the same code, but now its super() lands on Caching
print(Model2().save())

# 3. Cooperative __init__: take your kwargs, pass the rest on.
class Shape:
    def __init__(self, **kw):
        print("Shape.__init__ leftovers:", kw)
        super().__init__(**kw)

class Coloured(Shape):
    def __init__(self, colour, **kw):
        self.colour = colour
        super().__init__(**kw)

class Named(Shape):
    def __init__(self, name, **kw):
        self.name = name
        super().__init__(**kw)

class Label(Coloured, Named):
    pass

lab = Label(colour="red", name="title")
print(lab.colour, lab.name)
print([k.__name__ for k in Label.__mro__])

# 4. super(Cls, obj) starts the search AFTER Cls in type(obj).__mro__
m = Model2()
print(super(Logging, m).save())
print(super(Caching, m).save())

# 5. Why not plain depth-first? It would put A before C.
class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass
def dfs(cls):
    out = [cls]
    for b in cls.__bases__:
        out += dfs(b)
    return out
print("depth-first:", [k.__name__ for k in dfs(D)])
print("C3 (real):  ", [k.__name__ for k in D.__mro__])` },
    ],
  },
  {
    title: `What are abstract base classes and Protocols?`,
    difficulty: "medium",
    seoDescription: `Python ABCs vs Protocols: abc.ABC and @abstractmethod, register and __subclasshook__, typing.Protocol structural typing and runtime_checkable limits.`,
    description: `**Question presented to candidate:**
"Python lets you describe an interface in two ways: abstract base classes from \`abc\`, and \`Protocol\` from \`typing\`. What is each one, how do they differ, and when would you pick one over the other?"

**What a strong answer should cover:**
- An ABC (\`abc.ABC\`, metaclass \`ABCMeta\`) is a base class that declares \`@abstractmethod\`s; a subclass that does not implement all of them cannot be instantiated, and the check happens at instantiation time, at run time.
- ABCs are nominal: a class belongs by inheriting or by \`register()\` (a virtual subclass, unchecked); \`__subclasshook__\` lets an ABC such as \`collections.abc.Iterable\` accept any class with the right methods.
- A \`typing.Protocol\` (PEP 544, Python 3.8) is structural: any class with matching members satisfies it without inheriting; it is checked by static type checkers such as mypy and pyright, not at run time.
- \`@runtime_checkable\` allows \`isinstance()\` against a protocol, but it only checks that the member names exist, not their signatures or types; 3.12 changed the lookup to \`inspect.getattr_static\`.
- Trade-off: ABCs for frameworks you own that want enforcement and shared concrete methods; Protocols for describing what a function needs from objects you do not control, i.e. typed duck typing.

**Code / implementation expected:** Yes — an ABC that refuses to instantiate an incomplete subclass, and a Protocol matched by unrelated classes, with the \`runtime_checkable\` limits shown.`,
    answer: `**Target Audience:** Developers who know classes and inheritance and have seen \`ABC\` or \`Protocol\` in a codebase, up to candidates who need to compare nominal and structural typing precisely.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3); the differences we saw on 3.12 and 3.13 are called out.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A restaurant hires cooks in two different ways.

The first way is a **union card**. Only cooks who trained at the union school and carry the card get hired, and the school made sure each one can make the five house sauces. You know exactly what you are getting, but a brilliant self-taught cook without a card is turned away at the door.

The second way is a **tasting**. Anyone can walk in; if you can make the five sauces, you are hired. No card needed. Much more flexible, but someone has to actually run the tasting, and if the inspector only checks "did they bring a pan?", a person with a pan and no skills slips through.

Python has both. An **abstract base class** is the union card: a class qualifies by inheriting from it, and Python refuses to create an object that is missing a required method. A **Protocol** is the tasting: any class with the right methods qualifies, and the "inspector" is a static type checker like mypy or pyright. Knowing which one to use, and what each actually checks, is the interview question.

## 2. Abstract Base Classes: an Interface You Inherit

You define one by subclassing \`abc.ABC\` and marking required methods with \`@abstractmethod\`:

~~~python
from abc import ABC, abstractmethod

class Storage(ABC):
    @abstractmethod
    def read(self, key): ...

    @abstractmethod
    def write(self, key, value): ...

    def copy(self, src, dst):            # concrete, shared by all subclasses
        self.write(dst, self.read(src))
~~~

📌 **Interview term: Abstract base class (ABC)** — a class that exists to be subclassed and declares methods every subclass must provide. The \`abc\` module comes from [PEP 3119](https://peps.python.org/pep-3119/) (Guido van Rossum and Talin, 2007).

📌 **Interview term: Abstract method** — a method decorated with \`@abstractmethod\`. The class records the names in \`__abstractmethods__\`; Example 1 printed \`['read', 'write']\` for \`Storage\`.

The enforcement happens **when you create an instance**, not when you define the subclass. \`class HalfDone(Storage)\` that only implements \`read\` is accepted; \`HalfDone()\` is not. On 3.11 the message was:

~~~text
TypeError: Can't instantiate abstract class HalfDone with abstract method write
~~~

On 3.12 and 3.13 the same call printed \`Can't instantiate abstract class HalfDone without an implementation for abstract method 'write'\` — same rule, reworded message, so do not match on the text in tests.

📌 **Interview term: ABCMeta** — the metaclass behind \`ABC\` (Example 1 prints \`type(Storage).__name__\` as \`ABCMeta\`). It computes \`__abstractmethods__\` when the class is created and overrides \`isinstance\` and \`issubclass\` for the ABC. (Metaclasses in general: [what a metaclass is](/interview-question/what-is-a-metaclass).)

📌 **Interview term: Template method** — \`copy()\` above: a concrete method written in terms of the abstract ones. This is the big advantage of an ABC over a Protocol: subclasses inherit working code, not just obligations.

<svg class="iq-diagram" width="100%" viewBox="0 0 830 156" role="img" aria-label="Nominal typing with an ABC: the class inherits from the ABC, and isinstance checks inheritance or registration">
  <defs>
    <marker id="py19q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="190" height="76" rx="10"/>
  <text class="d-text" x="115" y="72" text-anchor="middle">MemoryStorage</text>
  <text class="d-sub" x="115" y="96" text-anchor="middle">class Mem(Storage)</text>
  <path class="d-edge-accent" d="M 218 88 L 310 88" marker-end="url(#py19q2-arrow)"/>
  <text class="d-sub d-accent" x="264" y="72" text-anchor="middle">inherits</text>
  <rect class="d-box-accent" x="320" y="40" width="190" height="76" rx="10"/>
  <text class="d-text" x="415" y="72" text-anchor="middle">Storage (ABC)</text>
  <text class="d-sub" x="415" y="96" text-anchor="middle">abstract read, write</text>
  <path class="d-edge-accent" d="M 518 88 L 610 88" marker-end="url(#py19q2-arrow)"/>
  <text class="d-sub d-accent" x="564" y="72" text-anchor="middle">checked by</text>
  <rect class="d-box-muted" x="620" y="40" width="190" height="76" rx="10"/>
  <text class="d-text" x="715" y="72" text-anchor="middle">isinstance</text>
  <text class="d-sub" x="715" y="96" text-anchor="middle">MRO or register</text>
</svg>

📌 **Interview term: Nominal typing** — "you are a \`Storage\` because your class says so". Compatibility is decided by declared inheritance.

### Two escape hatches from strict inheritance

**\`register()\`** declares a class a member without inheriting:

~~~python
class CloudStorage:      # no read, no write
    pass
Storage.register(CloudStorage)
isinstance(CloudStorage(), Storage)   # True
~~~

📌 **Interview term: Virtual subclass** — a class added with \`register()\`. It passes \`isinstance\` and \`issubclass\`, but **nothing is checked** (our \`CloudStorage\` has no methods at all) and the ABC is **not** in its MRO, so it does not inherit \`copy()\`. Example 1 prints \`Storage in CloudStorage.__mro__\` as \`False\`.

**\`__subclasshook__\`** lets the ABC decide by inspecting the class. This is how the ABCs in \`collections.abc\` work: \`isinstance(Countdown(3), Iterable)\` is \`True\` for a class that merely defines \`__iter__\`, and \`Sized\` is \`False\` because it has no \`__len__\`. Example 1 also writes a tiny \`Duck\` ABC whose hook accepts any class with a \`quack\` method. (The MRO itself is explained in [the Method Resolution Order](/interview-question/what-is-the-method-resolution-order-mro).)

📌 **Interview term: __subclasshook__** — a classmethod on an ABC that returns \`True\`, \`False\` or \`NotImplemented\` (fall back to the normal check) for \`issubclass(C, TheABC)\`.

## 3. Protocols: an Interface You Match

📌 **Interview term: Protocol** — a class that subclasses \`typing.Protocol\` and lists the members an object must have. Any class with those members is compatible; no inheritance or registration needed. It was added by [PEP 544](https://peps.python.org/pep-0544/) ("Protocols: Structural subtyping (static duck typing)") and shipped in Python 3.8.

~~~python
from typing import Protocol

class SupportsClose(Protocol):
    def close(self) -> None: ...

def shutdown(things: list[SupportsClose]) -> None:
    for t in things:
        t.close()
~~~

\`File\` and \`Socket\` in Example 2 never mention \`SupportsClose\`, yet both are valid arguments. At run time nothing special happens: the call works because both objects have \`close()\`, exactly like [duck typing](/interview-question/what-is-duck-typing-in-python). The value of the Protocol is that a **static type checker** can now verify it before the code runs.

<svg class="iq-diagram" width="100%" viewBox="0 0 830 156" role="img" aria-label="Structural typing with a Protocol: the class only has a matching method, and a static type checker compares the shapes">
  <defs>
    <marker id="py19q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="190" height="76" rx="10"/>
  <text class="d-text" x="115" y="72" text-anchor="middle">File</text>
  <text class="d-sub" x="115" y="96" text-anchor="middle">has close()</text>
  <path class="d-edge-accent" d="M 218 88 L 310 88" marker-end="url(#py19q2-arrow2)"/>
  <text class="d-sub d-accent" x="264" y="72" text-anchor="middle">matches shape</text>
  <rect class="d-box-accent" x="320" y="40" width="190" height="76" rx="10"/>
  <text class="d-text" x="415" y="72" text-anchor="middle">SupportsClose</text>
  <text class="d-sub" x="415" y="96" text-anchor="middle">a Protocol</text>
  <path class="d-edge-accent" d="M 518 88 L 610 88" marker-end="url(#py19q2-arrow2)"/>
  <text class="d-sub d-accent" x="564" y="72" text-anchor="middle">checked by</text>
  <rect class="d-box-muted" x="620" y="40" width="190" height="76" rx="10"/>
  <text class="d-text" x="715" y="72" text-anchor="middle">type checker</text>
  <text class="d-sub" x="715" y="96" text-anchor="middle">mypy or pyright</text>
</svg>

📌 **Interview term: Structural typing** — compatibility decided by shape: if you have the members, you match.

Here is what mypy said about a protocol with one correct class, one class whose \`greet\` has an extra parameter, and one class with no \`greet\` (we saved this as \`proto_check.py\` and ran mypy 2.3.1 on it in our sandbox; it is not one of the page examples because it needs a type checker). Lines 20, 21 and 22 are the three calls at the bottom:

~~~python
from typing import Protocol

class Greeter(Protocol):
    def greet(self, name: str) -> str: ...

class English:
    def greet(self, name: str) -> str:
        return "Hello, " + name

class Shouty:
    def greet(self, name: str, times: int) -> str:
        return name.upper() * times

class Mute:
    pass

def welcome(g: Greeter) -> str:
    return g.greet("Ada")

welcome(English())
welcome(Shouty())
welcome(Mute())
~~~

~~~text
proto_check.py:21: error: Argument 1 to "welcome" has incompatible type "Shouty"; expected "Greeter"  [arg-type]
proto_check.py:21: note: Following member(s) of "Shouty" have conflicts:
proto_check.py:21: note:     Expected:
proto_check.py:21: note:         def greet(self, name: str) -> str
proto_check.py:21: note:     Got:
proto_check.py:21: note:         def greet(self, name: str, times: int) -> str
proto_check.py:22: error: Argument 1 to "welcome" has incompatible type "Mute"; expected "Greeter"  [arg-type]
~~~

The checker compared the **signatures**, not just the names. That is the part a run-time check cannot do. (Type hints in general: [how type hints work](/interview-question/how-do-type-hints-work-in-python); generic protocols use [TypeVar](/interview-question/what-are-generics-and-typevar-in-python).)

### \`@runtime_checkable\` and its limits

By default, \`isinstance(obj, SupportsClose)\` raises \`TypeError: Instance and class checks can only be used with @runtime_checkable protocols\`. Adding the decorator allows it, but read the fine print:

📌 **Interview term: runtime_checkable** — a decorator from \`typing\` that makes \`isinstance\` and \`issubclass\` work with a Protocol by checking **only that each member name exists** on the object. Signatures, return types and even callability are ignored. Example 2's \`Liar\` class with \`greet = 42\` passes \`isinstance(Liar(), Greeter)\`.

Two more rules from Example 2:

- A protocol with a **data member** (\`name: str\`) supports \`isinstance\` but not \`issubclass\`: \`TypeError: Protocols with non-method members don't support issubclass()\`.
- **3.12 changed the lookup.** Since 3.12, \`isinstance\` against a runtime-checkable protocol uses \`inspect.getattr_static\` instead of \`hasattr\`, so \`__getattr__\` and descriptors are not evaluated during the check (per the [Python 3.12 What's New](https://docs.python.org/3/whatsnew/3.12.html)). Example 2's last line, a \`Proxy\` that serves \`greet\` through \`__getattr__\`, printed \`True\` on 3.11 and \`False\` on 3.12 and 3.13 in our runs.

## 4. ABC vs Protocol

| | Abstract base class | Protocol |
| :--- | :--- | :--- |
| How a class qualifies | inherits (or \`register()\`, or a \`__subclasshook__\`) | has the members; no inheritance needed |
| Kind of typing | nominal | structural |
| Who checks | the run time, at instantiation | a static type checker; at run time only with \`@runtime_checkable\`, names only |
| Signatures checked | no | yes, by the type checker |
| Can provide shared code | yes, concrete methods are inherited | only to classes that inherit it explicitly |
| Works with classes you do not own | only through \`register()\` | yes, that is the point |
| Typical home | frameworks and plugin bases, \`collections.abc\`, \`numbers\` | function parameters, library APIs, typed duck typing |

**When to use which.** Use an ABC when you own the hierarchy, want Python to refuse incomplete implementations, and want to share concrete behaviour (the template-method style). Use a Protocol when you describe what a function needs from an argument, especially when the arguments come from code you do not control, and you want the type checker to verify it. The two also combine: \`collections.abc.Iterable\` is an ABC that type checkers treat structurally.

## 5. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs matched. Example 2 was also run on python3.12 and python3.13, where only the last line changed, to \`Proxy matches Greeter: False\`.

**Example 1 — an ABC, \`register()\` and \`__subclasshook__\`** prints:

~~~text
['read', 'write']
TypeError: Can't instantiate abstract class Storage with abstract methods read, write
TypeError: Can't instantiate abstract class HalfDone with abstract method write
{'a': 1, 'b': 1}
True
ABCMeta
True
False
True
False
False
True
False
~~~

**Example 2 — Protocols, \`@runtime_checkable\` and its limits** prints:

~~~text
file closed
socket closed
TypeError: Instance and class checks can only be used with @runtime_checkable protocols
True
True
False
False
True
TypeError: Protocols with non-method members don't support issubclass()
TypeError: Protocols cannot be instantiated
Bonjour, Ada
Proxy matches Greeter: True
~~~

**What the output shows:**

- \`Storage()\` and \`HalfDone()\` were refused; \`MemoryStorage\` worked and inherited \`copy()\`.
- \`register()\` made a method-less class pass \`isinstance\`, and the ABC never appeared in its MRO.
- \`Countdown\` is an \`Iterable\` without inheriting, because \`Iterable.__subclasshook__\` looks for \`__iter__\`.
- \`File\` and \`Socket\` satisfied \`SupportsClose\` with no link to it; \`isinstance\` on a plain Protocol raised \`TypeError\`.
- The runtime-checkable \`Greeter\` accepted \`Liar\`, whose \`greet\` is the integer 42: names only.

## 6. Edge Cases

- **Abstract properties and classmethods.** Stack \`@property\` (or \`@classmethod\`) on top of \`@abstractmethod\`, with \`@abstractmethod\` innermost; a subclass without the property then fails with \`Can't instantiate abstract class B with abstract method size\` (our 3.11 run).
- **Abstract methods can have bodies.** Subclasses can call them with \`super().read(key)\`; being abstract only blocks instantiation of classes that do not override them.
- **Adding an abstract method later.** \`__abstractmethods__\` is computed at class creation. On our 3.11 run, attaching \`C.g = abstractmethod(g)\` to an existing ABC left \`C.__abstractmethods__\` empty and \`C()\` still worked, until we called \`abc.update_abstractmethods(C)\`, which recomputed it (the function came from CPython issue bpo-41905; we did not confirm the exact release it first shipped in).
- **\`isinstance\` with a runtime protocol is slower** than with a normal class, because it inspects members on every call; avoid it in hot loops.
- **ABCs do not check signatures either.** An override \`def read(self)\` that drops the \`key\` parameter satisfied the ABC on our run and could be instantiated; only a type checker notices.

## Common Pitfalls

- **Trusting \`isinstance(x, SomeProtocol)\` as a full check.** It confirms names exist, nothing more; the call can still fail with the wrong arguments.
- **Forgetting that the ABC check is at instantiation.** An incomplete subclass imports fine and only fails when some code path creates it, sometimes in production.
- **Using \`register()\` as if it validated anything.** It is a promise you make; Python takes your word for it.
- **Writing an ABC where a Protocol would do.** Forcing third-party classes to inherit your base is often impossible; describe the shape instead.
- **Expecting a Protocol to raise at run time when a method is missing.** Without a type checker in CI, a Protocol annotation changes nothing about how the code runs.
- **Matching error messages in tests.** The "Can't instantiate abstract class" wording changed between 3.11 and 3.12.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Both describe an interface:</strong> <span style="color:#f0e2c8;">An ABC and a Protocol both say "an object of this kind has these methods". The difference is how a class qualifies and who checks it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. ABC:</strong> <span style="color:#f0e2c8;">An abstract base class subclasses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">abc.ABC</code> and marks methods with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@abstractmethod</code>. A subclass must implement them all or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: Can't instantiate abstract class</code> is raised when you create an instance. ABCs can also carry shared concrete methods.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Nominal plus escape hatches:</strong> <span style="color:#f0e2c8;">ABCs are nominal: you belong by inheriting. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">register()</code> adds a virtual subclass with no checks, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__subclasshook__</code> lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">collections.abc.Iterable</code> accept any class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iter__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Protocol:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.Protocol</code>, from PEP 544 in Python 3.8, is structural: any class with matching members fits, no inheritance needed. mypy or pyright check it statically, including signatures. It is duck typing with types.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Run time and choice:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@runtime_checkable</code> enables <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code>, but it only checks that the names exist. Use an ABC when you own the hierarchy and want enforcement; use a Protocol to describe what a function needs from third-party or unrelated classes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When exactly is the abstract-method check done?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At instantiation, not at class definition. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class HalfDone(Storage)</code> is created without complaint; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">HalfDone()</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. CPython keeps the missing names in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls.__abstractmethods__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__new__</code> refuses while it is non-empty.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isinstance(x, MyProtocol)</code> check the method signatures?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@runtime_checkable</code> it only checks that each member name exists. Example 2 shows a class with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greet = 42</code> passing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(..., Greeter)</code>. Signatures are checked only by a static type checker; mypy rejected a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greet(self, name, times)</code> method in our run.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">register()</code> do and what is the risk?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">issubclass</code> return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> for a class that never inherited from the ABC. Nothing is checked: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Storage.register(CloudStorage)</code> worked even though <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CloudStorage</code> had no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write</code>. The class also does not gain the ABC's concrete methods, because the ABC is not in its MRO.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a class inherit from a Protocol explicitly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and then it behaves like a normal base: the class gets the protocol's default method bodies and a type checker verifies the class against it at the definition. The protocol itself still cannot be instantiated: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Greeter()</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: Protocols cannot be instantiated</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed for runtime-checkable protocols in 3.12?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code> now looks members up with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">inspect.getattr_static</code> instead of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasattr</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> and properties are no longer run during the check. Our <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Proxy</code> class that provides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">greet</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getattr__</code> matched on 3.11 and did not match on 3.12 and 3.13.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Abstract base class (ABC)** | a class, usually subclassing \`abc.ABC\`, that declares methods subclasses must implement |
| **Abstract method** | a method marked \`@abstractmethod\`; while any remain unimplemented the class cannot be instantiated |
| **ABCMeta** | the metaclass behind \`abc.ABC\`; it tracks \`__abstractmethods__\` and customises \`isinstance\`/\`issubclass\` |
| **Virtual subclass** | a class added with \`ABC.register(cls)\`; it passes \`isinstance\` without inheriting and without any checks |
| **__subclasshook__** | a classmethod on an ABC that can decide \`issubclass\` by inspecting the candidate class |
| **Nominal typing** | compatibility decided by declared inheritance: you are a \`Storage\` because you said so |
| **Structural typing** | compatibility decided by shape: you match if you have the required members |
| **Protocol** | a \`typing.Protocol\` subclass that describes a shape for static type checkers |
| **runtime_checkable** | a decorator that lets a Protocol be used with \`isinstance\`, checking member names only |
| **Template method** | a concrete method on a base class that is written in terms of abstract methods the subclasses fill in |

---
**Conclusion:** Abstract base classes and Protocols both describe an interface, from opposite directions. An ABC is nominal: classes join by inheriting (or by \`register()\` and \`__subclasshook__\`), Python refuses to instantiate a class with unimplemented abstract methods, and the ABC can hand down shared concrete code. A Protocol is structural: any class with the right members matches, the static type checker verifies names and signatures, and \`@runtime_checkable\` adds only a names-exist check at run time, whose lookup rules changed in 3.12. Reach for an ABC when you own the hierarchy and want enforcement and shared code; reach for a Protocol to type the duck typing Python already does.`,
    examples: [
      { label: `An ABC, register() and __subclasshook__`, code: `from abc import ABC, abstractmethod
from collections.abc import Iterable, Sized

# 1. An ABC declares methods every subclass MUST implement.
class Storage(ABC):
    @abstractmethod
    def read(self, key): ...

    @abstractmethod
    def write(self, key, value): ...

    # a concrete "template" method built on the abstract ones
    def copy(self, src, dst):
        self.write(dst, self.read(src))

print(sorted(Storage.__abstractmethods__))  # ['read', 'write']

try:
    Storage()
except TypeError as e:
    print("TypeError:", e)

class HalfDone(Storage):
    def read(self, key):
        return None

try:
    HalfDone()
except TypeError as e:
    print("TypeError:", e)

class MemoryStorage(Storage):
    def __init__(self):
        self.data = {}
    def read(self, key):
        return self.data[key]
    def write(self, key, value):
        self.data[key] = value

m = MemoryStorage()
m.write("a", 1)
m.copy("a", "b")
print(m.data)  # {'a': 1, 'b': 1}
print(isinstance(m, Storage))  # True
print(type(Storage).__name__)  # ABCMeta

# 2. register(): a "virtual subclass" passes isinstance with no checks.
class CloudStorage:          # does not inherit, has no read/write
    pass
Storage.register(CloudStorage)
print(isinstance(CloudStorage(), Storage))  # True
print(Storage in CloudStorage.__mro__)  # False

# 3. __subclasshook__: collections.abc ABCs recognise shapes.
class Countdown:
    def __init__(self, n):
        self.n = n
    def __iter__(self):
        return iter(range(self.n, 0, -1))

print(isinstance(Countdown(3), Iterable))  # True
print(isinstance(Countdown(3), Sized))  # False
print(Iterable in Countdown.__mro__)  # False

# Your own hook: anything with a .quack method is a Duck.
class Duck(ABC):
    @classmethod
    def __subclasshook__(cls, C):
        if cls is Duck:
            return any("quack" in K.__dict__ for K in C.__mro__)
        return NotImplemented

class Robot:
    def quack(self):
        return "beep quack"

print(isinstance(Robot(), Duck))  # True
print(isinstance(42, Duck))  # False` },
      { label: `Protocols, runtime_checkable and its limits`, code: `from typing import Protocol, runtime_checkable

# 1. A Protocol describes a shape. Classes match it WITHOUT inheriting.
class SupportsClose(Protocol):
    def close(self) -> None: ...

class File:
    def close(self) -> None:
        print("file closed")

class Socket:
    def close(self) -> None:
        print("socket closed")

def shutdown(things: list[SupportsClose]) -> None:
    for t in things:
        t.close()

# A type checker accepts both; at run time this is plain duck typing.
shutdown([File(), Socket()])

# 2. Without @runtime_checkable, isinstance refuses to answer.
try:
    isinstance(File(), SupportsClose)
except TypeError as e:
    print("TypeError:", e)

# 3. @runtime_checkable: isinstance checks that names EXIST, nothing more.
@runtime_checkable
class Greeter(Protocol):
    def greet(self, name: str) -> str: ...

class English:
    def greet(self, name: str) -> str:
        return "Hello, " + name

class Liar:
    greet = 42           # not even callable

print(isinstance(English(), Greeter))  # True
print(isinstance(Liar(), Greeter))  # True
print(isinstance("text", Greeter))  # False
print(Greeter in English.__mro__)  # False

# 4. A protocol with a data member: isinstance works, issubclass does not.
@runtime_checkable
class Named(Protocol):
    name: str

class User:
    def __init__(self):
        self.name = "ada"

print(isinstance(User(), Named))  # True
try:
    issubclass(User, Named)
except TypeError as e:
    print("TypeError:", e)

# 5. Protocols cannot be instantiated; you can inherit explicitly.
try:
    Greeter()
except TypeError as e:
    print("TypeError:", e)

class French(Greeter):            # explicit opt-in, like an ABC
    def greet(self, name: str) -> str:
        return "Bonjour, " + name
print(French().greet("Ada"))  # Bonjour, Ada

# 6. Run-time check uses hasattr on 3.11, so __getattr__ counts.
class Proxy:
    def __getattr__(self, attr):
        if attr == "greet":
            return lambda name: "proxied " + name
        raise AttributeError(attr)
print("Proxy matches Greeter:", isinstance(Proxy(), Greeter))` },
    ],
  },
  {
    title: `What is duck typing in Python?`,
    difficulty: "easy",
    seoDescription: `Duck typing in Python explained from zero: behaviour over type, special methods behind len and for, EAFP vs LBYL, pitfalls, and typing it with Protocol.`,
    description: `**Question presented to candidate:**
"People say Python uses duck typing. What does that mean in practice, and what are the upsides and the risks?"

**What a strong answer should cover:**
- Duck typing: code relies on what an object can do (its methods and attributes), not on its declared class; "if it walks like a duck and quacks like a duck, treat it as a duck".
- Python checks at the moment of use: a missing method raises \`AttributeError\` (or \`TypeError\` for operators) at run time, not at compile time.
- The built-ins work the same way: \`len()\`, \`for\`, \`in\`, \`+\` and \`with\` call special methods such as \`__len__\`, \`__iter__\`, \`__contains__\`, \`__add__\`, so any class that defines them plugs into the language; file-like objects such as \`io.StringIO\` are the classic example.
- The usual style is EAFP (try it, catch the exception) rather than LBYL (\`hasattr\`/\`isinstance\` checks first), and \`isinstance\` against a concrete class is the opposite of duck typing.
- Trade-offs: flexible and easy to test with fakes, but errors surface late and a name can match while the meaning does not; \`typing.Protocol\` lets a type checker verify the shape statically.

**Code / implementation expected:** Optional — a function that accepts any object with the right method, and a class that works with \`len()\`/\`for\` because it defines the special methods.`,
    answer: `**Target Audience:** Beginners who know functions and classes, and anyone who wants a crisp interview definition with real examples.
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

You need someone to drive a van across town. Do you ask for their birth certificate, their school diploma and a letter saying they belong to the Official Van Drivers Guild? No. You ask one thing: *can you drive?* If yes, here are the keys.

Some programming languages are like the strict employer: a function only accepts an argument whose declared type is in the paperwork. Python is like the practical employer. A function says "I will call \`.read()\` on whatever you give me", and any object that can \`read()\` is welcome, whatever class it came from. That is **duck typing**, named after the saying: *if it walks like a duck and quacks like a duck, it is a duck.*

It matters in interviews because it explains why Python code looks the way it does: why functions rarely check types, why \`io.StringIO\` can stand in for a file, why your own class can work with \`len()\` and \`for\`, and why the errors show up at run time.

## 2. The Core Idea: Ask for Behaviour, Not a Type

~~~python
def word_count(source):
    return len(source.read().split())
~~~

This function never says what \`source\` must be. It needs exactly one thing: a \`read()\` method that returns a string.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 330" role="img" aria-label="Three unrelated objects, a StringIO, an open file and a custom Upper class, can all be passed to word_count because each has a read method">
  <defs>
    <marker id="py19q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="20" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="50" text-anchor="middle">io.StringIO</text>
  <text class="d-sub" x="120" y="72" text-anchor="middle">has read()</text>
  <rect class="d-box" x="20" y="130" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="160" text-anchor="middle">open file</text>
  <text class="d-sub" x="120" y="182" text-anchor="middle">has read()</text>
  <rect class="d-box" x="20" y="240" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="270" text-anchor="middle">Upper</text>
  <text class="d-sub" x="120" y="292" text-anchor="middle">has read()</text>
  <rect class="d-box-accent" x="400" y="125" width="220" height="80" rx="10"/>
  <text class="d-text" x="510" y="158" text-anchor="middle">word_count(src)</text>
  <text class="d-sub" x="510" y="182" text-anchor="middle">only calls src.read()</text>
  <path class="d-edge-accent" d="M 228 60 L 392 150" marker-end="url(#py19q3-arrow)"/>
  <path class="d-edge-accent" d="M 228 165 L 392 165" marker-end="url(#py19q3-arrow)"/>
  <path class="d-edge-accent" d="M 228 270 L 392 180" marker-end="url(#py19q3-arrow)"/>
</svg>

Example 1 passes an \`io.StringIO\` and a home-made \`Upper\` class that has nothing to do with files; both work. Passing \`42\` fails, and only when the line runs:

~~~text
AttributeError: 'int' object has no attribute 'read'
~~~

📌 **Interview term: Duck typing** — writing code that depends on the methods and attributes an object has, not on its class. The object is accepted if it can do what is asked, at the moment it is asked.

📌 **Interview term: Dynamic typing** — in Python, types belong to objects, not to variable names, and are checked while the program runs. Duck typing is the coding *style* this makes natural. (How names and objects relate: [Python's name and object reference model](/interview-question/how-does-python-s-name-and-object-reference-model-work).)

📌 **Interview term: File-like object** — any object with the file methods the caller needs. The standard library is full of functions documented as taking "a file-like object", and \`io.StringIO\` / \`io.BytesIO\` are the in-memory stand-ins everyone uses in tests.

## 3. The Language Itself Is Duck-Typed

The built-in functions and operators work the same way. \`len(p)\` does not check whether \`p\` is a list; it looks up a special method on the object's type and calls it:

<svg class="iq-diagram" width="100%" viewBox="0 0 840 156" role="img" aria-label="Calling len on an object makes Python look up __len__ on its type and call it">
  <defs>
    <marker id="py19q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="200" height="76" rx="10"/>
  <text class="d-text" x="120" y="72" text-anchor="middle">len(p)</text>
  <text class="d-sub" x="120" y="96" text-anchor="middle">built-in call</text>
  <path class="d-edge-accent" d="M 228 88 L 310 88" marker-end="url(#py19q3-arrow2)"/>
  <text class="d-sub d-accent" x="269" y="72" text-anchor="middle">looks up</text>
  <rect class="d-box-accent" x="320" y="40" width="200" height="76" rx="10"/>
  <text class="d-text" x="420" y="72" text-anchor="middle">type(p).__len__</text>
  <text class="d-sub" x="420" y="96" text-anchor="middle">looked up on the class</text>
  <path class="d-edge-accent" d="M 528 88 L 610 88" marker-end="url(#py19q3-arrow2)"/>
  <text class="d-sub d-accent" x="569" y="72" text-anchor="middle">returns</text>
  <rect class="d-box-muted" x="620" y="40" width="200" height="76" rx="10"/>
  <text class="d-text" x="720" y="72" text-anchor="middle">3</text>
  <text class="d-sub" x="720" y="96" text-anchor="middle">an int back</text>
</svg>

📌 **Interview term: Special method** — a method with double underscores on both sides (a "dunder") that Python calls for you: \`__len__\` for \`len()\`, \`__iter__\` for \`for\` loops, \`__contains__\` for \`in\`, \`__add__\` for \`+\`, \`__enter__\`/\`__exit__\` for \`with\`. See [dunder methods](/interview-question/what-are-dunder-magic-methods) for the full list.

So Example 1's \`Playlist\`, which defines \`__len__\`, \`__iter__\` and \`__contains__\`, works with \`len()\`, \`list()\`, \`in\`, \`sorted()\` and \`", ".join()\`, none of which have ever heard of \`Playlist\`.

📌 **Interview term: Protocol (informal)** — the set of methods an object needs for some role. The *iterator protocol* is \`__iter__\` plus \`__next__\`; the *sequence protocol* is \`__getitem__\` plus \`__len__\`. (Python also has a formal \`typing.Protocol\`; see section 6.)

Two details from Example 1 show how deep this goes:

- **Old-style iteration.** \`Squares\` defines only \`__getitem__\`. A \`for\` loop still works: when there is no \`__iter__\`, \`iter()\` falls back to calling \`__getitem__(0)\`, \`__getitem__(1)\`, ... until \`IndexError\`. \`list(Squares())\` printed \`[0, 1, 4, 9]\`, and \`9 in Squares()\` printed \`True\`. (The full loop machinery is in [how a for loop works under the hood](/interview-question/how-does-a-for-loop-work-under-the-hood) and [iterable vs iterator](/interview-question/what-is-the-difference-between-an-iterable-and-an-iterator).)
- **Operators negotiate.** \`Money.__add__\` returns \`NotImplemented\` for anything that is not \`Money\`, which tells Python to try the other operand's \`__radd__\`. \`sum()\` starts from \`0\`, so \`Money.__radd__\` accepts \`0\`; then \`sum([Money(150), Money(250)])\` printed \`Money(400)\`. \`Money(1) + "x"\` ended with \`TypeError: unsupported operand type(s) for +: 'Money' and 'str'\`. ([How a + b dispatches](/interview-question/how-does-a-b-dispatch-in-python) covers this in depth.)

📌 **Interview term: NotImplemented** — a special value a binary special method returns to say "I do not know how to handle this operand", so Python can try the reflected method or raise \`TypeError\`. It is not the exception \`NotImplementedError\`.

## 4. Checking the Duck: EAFP, LBYL, and Not Checking at All

Sometimes you do want to handle "this object cannot do it". There are two Pythonic styles and one un-Pythonic one, all in Example 2:

| Style | Code | Accepts a look-alike? |
| :--- | :--- | :--- |
| 📌 **EAFP** (Easier to Ask Forgiveness than Permission) | \`try: x.quack()\` / \`except AttributeError:\` | yes |
| 📌 **LBYL** (Look Before You Leap) | \`if hasattr(x, "quack"): x.quack()\` | yes |
| 📌 **Nominal typing** (type check) | \`if isinstance(x, Duck): x.quack()\` | **no**, \`Person\` is rejected |

Our run printed:

~~~text
Duck | Quack! | Quack! | Quack!
Person | I am quacking | I am quacking | rejected: not a Duck
Rock | cannot quack | cannot quack | rejected: not a Duck
~~~

\`Person\` can quack perfectly well, yet the \`isinstance\` version turns it away; that is the opposite of duck typing. EAFP is the usual Python preference (it does one lookup instead of two, and has no gap between the check and the use); the trade-offs are in [EAFP vs LBYL](/interview-question/what-is-eafp-vs-lbyl-in-python).

**EAFP has a trap.** A broad \`try\` around the *call* also catches an \`AttributeError\` raised *inside* the method. \`Broken.quack\` has a bug (\`self.sound\` does not exist), but \`eafp(Broken())\` printed \`cannot quack\`, hiding it. The fix is to guard only the lookup:

~~~python
def eafp_safe(x):
    try:
        method = x.quack            # only the lookup is guarded
    except AttributeError:
        return "cannot quack"
    return method()                 # a bug inside now surfaces
~~~

which surfaced the real error: \`'Broken' object has no attribute 'sound'\`.

## 5. Where Duck Typing Bites

- **Right name, wrong meaning.** \`Dog.bark()\` is a method; \`Tree.bark\` is a string. Code that calls \`.bark()\` gets \`TypeError: 'str' object is not callable\` from the tree. Duck typing matches *names*; it cannot know that two classes mean different things by them.
- **Strings are iterables of strings.** Every one-character string is itself iterable, so a recursive "flatten anything iterable" function would never stop on a string. Example 2's \`flatten\` special-cases \`str\` and \`bytes\` using \`collections.abc.Iterable\`, an ABC that recognises any class with \`__iter__\` (more on that in [abstract base classes and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols)).
- **Late errors.** A missing method is found only when that line runs, possibly in production, on the one code path the tests did not cover.

## 6. Duck Typing With Types: \`typing.Protocol\`

Since Python 3.8 ([PEP 544](https://peps.python.org/pep-0544/), subtitled "static duck typing") you can describe the duck in a type hint:

~~~python
from typing import Protocol

class Readable(Protocol):
    def read(self) -> str: ...

def word_count(source: Readable) -> int:
    return len(source.read().split())
~~~

Nothing changes at run time; \`StringIO\` and \`Upper\` still work without inheriting \`Readable\`. The gain is that mypy or pyright can now reject \`word_count(42)\` before the program runs. The details, and how this differs from abstract base classes, are on the [ABCs and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols) page.

## 7. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs matched.

**Example 1 — behaviour over type, and the built-ins that rely on it** prints:

~~~text
4
3
AttributeError: 'int' object has no attribute 'read'
3
['Intro', 'Song A', 'Outro']
True
['Intro', 'Outro', 'Song A']
Intro, Song A, Outro
[0, 1, 4, 9]
True
Money(400)
TypeError: unsupported operand type(s) for +: 'Money' and 'str'
~~~

**Example 2 — EAFP vs LBYL vs isinstance, and the pitfalls** prints:

~~~text
Duck | Quack! | Quack! | Quack!
Person | I am quacking | I am quacking | rejected: not a Duck
Rock | cannot quack | cannot quack | rejected: not a Duck
eafp(Broken()): cannot quack
bug surfaced: 'Broken' object has no attribute 'sound'
[1, 2, 3, 'abc', 4, 5]
['a', 'b', 'c'] ['a']
Dog Woof
Tree TypeError: 'str' object is not callable
~~~

**What the output shows:**

- \`word_count\` worked for a \`StringIO\` (4 words) and for \`Upper\` (3 words); \`42\` failed with \`AttributeError\` at the call.
- \`Playlist\` plugged into \`len\`, \`list\`, \`in\`, \`sorted\` and \`join\` through three special methods, and \`in\` used its own case-insensitive \`__contains__\`.
- \`Squares\` iterated with only \`__getitem__\`; \`Money\` summed through \`__add__\` and \`__radd__\`.
- The \`isinstance\` check rejected \`Person\`, the broad \`except\` hid \`Broken\`'s bug, and \`Tree.bark\` showed a name match with the wrong meaning.

## Common Pitfalls

- **Adding \`isinstance\` checks "for safety".** Checking a concrete class rejects valid look-alikes such as mocks and \`StringIO\`; check for the behaviour, or for an ABC from \`collections.abc\`, if you must check.
- **Wrapping the whole call in \`try\`/\`except AttributeError\`.** It swallows bugs inside the method; guard only the attribute lookup.
- **Forgetting \`str\` is iterable.** Code that accepts "any iterable of items" happily treats \`"abc"\` as \`['a', 'b', 'c']\`.
- **Returning \`None\` or raising \`TypeError\` instead of returning \`NotImplemented\`** from \`__add__\` and friends: it stops Python from trying the other operand.
- **Assuming a matching name means a matching contract.** Duck typing checks the name only; arguments, return values and meaning are up to you (or your type checker).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Duck typing means code depends on what an object can do, not on what class it is: if it has the method you call, it works. "If it walks like a duck and quacks like a duck, it is a duck."</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. When it is checked:</strong> <span style="color:#f0e2c8;">Python checks at the moment of use. Calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.read()</code> on an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError: 'int' object has no attribute 'read'</code> at run time; nothing is checked earlier.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The language itself does it:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len()</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> call special methods like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__len__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iter__</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__contains__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__add__</code>. Any class that defines them works with the built-ins; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">io.StringIO</code> works wherever a file is expected because it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read()</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write()</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Style:</strong> <span style="color:#f0e2c8;">Python prefers EAFP: just call it and catch the exception, instead of LBYL <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hasattr</code> checks. Checking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(x, SomeClass)</code> is the opposite of duck typing, because it rejects a perfectly good look-alike.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;">It is flexible and makes testing with fakes trivial, but errors appear late and a matching name can have a different meaning. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.Protocol</code> lets a type checker verify the shape before the code runs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is duck typing the same as dynamic typing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Related but not the same. Dynamic typing means names have no fixed type and types are checked at run time. Duck typing is a style on top: code asks for behaviour, not a class. A dynamically typed program full of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code> checks is not doing duck typing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">for</code> loop use duck typing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">iter()</code> on the object, which uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__iter__</code>, or falls back to calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getitem__</code> with 0, 1, 2, ... until <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IndexError</code>. Example 1's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Squares</code> class has only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getitem__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list(Squares())</code> gives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[0, 1, 4, 9]</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the danger of a broad <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">try</code>/<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">except AttributeError</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It also catches an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> raised inside the method, which hides real bugs. Example 2's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Broken.quack</code> has a bug, yet <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eafp()</code> reported "cannot quack". Guard only the attribute lookup, then call the method outside the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">try</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add type safety without giving up duck typing?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Annotate parameters with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.Protocol</code> that lists the needed methods. Any class with those methods is accepted by mypy or pyright without inheriting anything, and calls with a missing or wrong-signature method are flagged before run time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">str</code> a classic duck-typing trap?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A string is iterable and each item is again a string, so code that recursively flattens "anything iterable" never stops on a string, or splits it into letters. You usually special-case <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code>, as Example 2 does.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Duck typing** | relying on an object's methods and attributes rather than its class |
| **Dynamic typing** | types belong to objects, not names, and are checked while the program runs |
| **Protocol (informal)** | a set of methods an object must have to work in some role, such as the iterator protocol |
| **Special method** | a \`__dunder__\` method the language calls for you, such as \`__len__\` for \`len()\` |
| **File-like object** | any object with the file methods a caller needs, such as \`io.StringIO\` |
| **EAFP** | Easier to Ask Forgiveness than Permission: try the operation and handle the exception |
| **LBYL** | Look Before You Leap: check with \`hasattr\`/\`isinstance\` before acting |
| **Nominal typing** | accepting objects by declared class or inheritance, the opposite approach |
| **NotImplemented** | the value a binary special method returns to say it does not handle that operand type |

---
**Conclusion:** Duck typing is Python's habit of judging an object by what it can do rather than by what class it is: a function calls the methods it needs and any object that has them is welcome, while a missing one shows up as an \`AttributeError\` or \`TypeError\` when the line runs. The language itself works this way, mapping \`len\`, \`for\`, \`in\`, \`+\` and \`with\` onto special methods, which is why your own classes and stand-ins like \`io.StringIO\` fit in seamlessly. Prefer EAFP over type checks, keep \`try\` blocks narrow, watch for strings and same-name-different-meaning traps, and add \`typing.Protocol\` when you want a type checker to confirm the duck before it ever quacks.`,
    examples: [
      { label: `Behaviour over type, and the built-ins that rely on it`, code: `import io

# 1. The function asks for a behaviour (.read()), not a type.
def word_count(source):
    return len(source.read().split())

class Upper:
    """Not a file at all, but it can read()."""
    def __init__(self, text):
        self.text = text
    def read(self):
        return self.text.upper()

print(word_count(io.StringIO("the quick brown fox")))  # 4
print(word_count(Upper("one two three")))  # 3

try:
    word_count(42)
except AttributeError as e:
    print("AttributeError:", e)

# 2. Built-ins are duck-typed too: they call special methods.
class Playlist:
    def __init__(self, *songs):
        self.songs = list(songs)
    def __len__(self):
        return len(self.songs)
    def __iter__(self):
        return iter(self.songs)
    def __contains__(self, song):
        return song.lower() in (s.lower() for s in self.songs)

p = Playlist("Intro", "Song A", "Outro")
print(len(p))  # 3
print(list(p))  # ['Intro', 'Song A', 'Outro']
print("song a" in p)  # True
print(sorted(p))  # ['Intro', 'Outro', 'Song A']
print(", ".join(p))  # Intro, Song A, Outro

# 3. Even the older protocol works: __getitem__ alone makes a for loop run.
class Squares:
    def __getitem__(self, i):
        if i >= 4:
            raise IndexError(i)
        return i * i

print(list(Squares()))  # [0, 1, 4, 9]
print(9 in Squares())  # True

# 4. Operators are duck-typed: + calls __add__, then __radd__.
class Money:
    def __init__(self, cents):
        self.cents = cents
    def __add__(self, other):
        if isinstance(other, Money):
            return Money(self.cents + other.cents)
        return NotImplemented
    def __radd__(self, other):
        # lets sum() start from 0
        return self if other == 0 else NotImplemented
    def __repr__(self):
        return f"Money({self.cents})"

print(sum([Money(150), Money(250)]))  # Money(400)
try:
    Money(1) + "x"
except TypeError as e:
    print("TypeError:", e)` },
      { label: `EAFP vs LBYL vs isinstance, and where duck typing bites`, code: `from collections.abc import Iterable

# 1. Three ways to "check the duck".
class Duck:
    def quack(self):
        return "Quack!"

class Person:
    def quack(self):
        return "I am quacking"

class Rock:
    pass

def lbyl(x):            # look before you leap
    if hasattr(x, "quack"):
        return x.quack()
    return "cannot quack"

def eafp(x):            # easier to ask forgiveness than permission
    try:
        return x.quack()
    except AttributeError:
        return "cannot quack"

def nominal(x):         # NOT duck typing: demands a type
    if isinstance(x, Duck):
        return x.quack()
    return "rejected: not a Duck"

for thing in (Duck(), Person(), Rock()):
    print(type(thing).__name__, "|", lbyl(thing), "|", eafp(thing), "|", nominal(thing))

# 2. Pitfall: EAFP can hide a bug INSIDE the method.
class Broken:
    def quack(self):
        return self.sound.upper()     # typo-style bug: no .sound

print("eafp(Broken()):", eafp(Broken()))

def eafp_safe(x):
    try:
        method = x.quack            # only the lookup is guarded
    except AttributeError:
        return "cannot quack"
    return method()

try:
    eafp_safe(Broken())
except AttributeError as e:
    print("bug surfaced:", e)

# 3. Pitfall: strings quack like iterables of strings, forever.
def flatten(items):
    out = []
    for item in items:
        if isinstance(item, Iterable) and not isinstance(item, (str, bytes)):
            out.extend(flatten(item))
        else:
            out.append(item)
    return out

print(flatten([1, [2, [3, "abc"]], (4, 5)]))  # [1, 2, 3, 'abc', 4, 5]
print(list("abc"), list("a"))  # ['a', 'b', 'c'] ['a']

# 4. Pitfall: right name, wrong meaning.
class Tree:
    def __init__(self):
        self.bark = "rough"          # bark is data here, not a sound

class Dog:
    def bark(self):
        return "Woof"

for t in (Dog(), Tree()):
    try:
        print(type(t).__name__, t.bark())
    except TypeError as e:
        print(type(t).__name__, "TypeError:", e)` },
    ],
  },
  {
    title: `What is monkey patching in Python?`,
    difficulty: "medium",
    seoDescription: `Monkey patching in Python: replacing attributes on classes, instances and modules at run time, the from-import trap, unittest.mock.patch, and the risks.`,
    description: `**Question presented to candidate:**
"What is monkey patching? Show me how you would do it, tell me where it is genuinely useful, and why many teams treat it as a code smell outside of tests."

**What a strong answer should cover:**
- Monkey patching is replacing or adding an attribute (a method, function or value) on a class, instance or module at run time, without editing its source; it works because classes and modules are mutable objects whose attributes are looked up when used.
- Scope: patching a class affects every instance, old and new; patching an instance needs \`types.MethodType\` to bind \`self\`; patching a module affects only code that looks the name up through the module.
- The from-import trap: \`from clock import now\` copies a reference, so patching \`clock.now\` does not affect it; with \`unittest.mock.patch\` you patch where the name is looked up.
- Main legitimate use is testing: \`unittest.mock.patch\` / \`patch.object\` (stdlib since 3.3) or pytest \`monkeypatch\`, which restore the original automatically; others are hotfixing a third-party bug and libraries like gevent that patch the stdlib.
- Risks: global, invisible side effects, order-dependent behaviour, breakage on library upgrades, and built-in types such as \`str\` cannot be patched at all.

**Clarifying questions expected:**
- Is this for tests or for production code? The acceptable answer differs.

**Code / implementation expected:** Yes — patch a class method and a module function, show the from-import trap, and the same done safely with \`unittest.mock.patch\`.`,
    answer: `**Target Audience:** Developers who have seen \`mock.patch\` in tests or a "quick fix" that reassigns a library function, up to candidates who must explain scope, the import trap and the risks.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3); spot checks on 3.12 and 3.13 are noted.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture a theatre. Halfway through the run, the lead actor loses their voice. Nobody rewrites the play or rebuilds the stage; the director quietly sends an understudy on in the same costume, and the audience hears the same lines from a different person. When the lead recovers, they swap back.

**Monkey patching** is sending in the understudy. While the program runs, you replace a method on a class, a function in a module or an attribute on one object, and every piece of code that looks up that name from then on gets your replacement. It is how tests replace "send an email" with "record that an email would have been sent", and how teams hotfix a bug in a library they cannot edit. It is also how a program ends up with behaviour nobody can find by reading the code, which is why interviewers ask when you would and would not do it.

## 2. Why Python Allows It

Two facts make it possible:

- **Classes, modules and most objects are mutable.** A class is an object whose attributes live in a dictionary; \`Greeter.hello = loud_hello\` just replaces an entry.
- **Names are looked up when the code runs.** \`obj.hello()\` finds \`hello\` at call time, and a function body that calls \`tax(amount)\` looks up \`tax\` in its module's globals at call time.

📌 **Interview term: Monkey patching** — modifying or extending a class, instance or module at run time, from outside, without changing its source code.

📌 **Interview term: Late binding (of names)** — Python resolves a name when the line runs, not when the code is defined, so rebinding the name changes what later calls get. (Name lookup rules: [the LEGB rule](/interview-question/what-is-the-legb-rule-for-scope-resolution); attribute lookup: [how attribute lookup works](/interview-question/how-does-attribute-lookup-work-on-a-python-object).)

## 3. Three Targets, Three Scopes

### Patching a class

~~~python
original = Greeter.hello
def loud_hello(self):
    return original(self).upper() + "!"
Greeter.hello = loud_hello
~~~

Every instance, including the ones created **before** the patch, now says \`HELLO!\`, because none of them has its own \`hello\`: they all look it up on the class. Example 1 printed \`HELLO! HELLO! HELLO!\` for two old instances and a new one. Keeping \`original\` lets the replacement call through to the old behaviour and lets you restore it.

### Patching one instance

Assigning a plain function to an instance does **not** make it a method:

~~~text
TypeError: shy() missing 1 required positional argument: 'self'
~~~

📌 **Interview term: Bound method** — what you get when Python finds a function **on the class** while looking up an attribute of an instance: the function with \`self\` already filled in. This is done by the descriptor protocol (see [the descriptor protocol](/interview-question/what-is-the-descriptor-protocol) and [bound and unbound methods](/interview-question/what-are-bound-and-unbound-methods-in-python)). A function stored in the instance's own \`__dict__\` skips that step.

📌 **Interview term: types.MethodType** — builds a bound method by hand: \`b.hello = types.MethodType(shy, b)\`. Only \`b\` changes; \`vars(b)\` now contains \`hello\` and \`vars(a)\` does not. Deleting the instance attribute (\`del b.hello\`) makes the class version visible again.

### Patching a module

~~~python
saved = pricing.tax
pricing.tax = lambda amount: 0
pricing.total(100)       # 100 instead of 120.0
pricing.tax = saved
~~~

\`total()\` looks up \`tax\` in the module's globals on every call, so it sees the patch. Example 1 builds \`pricing\` in memory with \`types.ModuleType\` so the example is self-contained; a real \`.py\` module behaves the same.

## 4. The from-Import Trap

This is the single most common monkey-patching bug, and the most common \`mock.patch\` question.

~~~python
from clock import now       # report.py: copies the reference into report
~~~

After that line, \`report\` has **its own name** \`now\` pointing at the same function object. Rebinding \`clock.now\` changes the name inside \`clock\` only:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="After patching clock.now, the name in the clock module points to the fake function, while the name copied into report by a from import still points to the real one">
  <defs>
    <marker id="py19q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">clock.now</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">name in clock</text>
  <rect class="d-box" x="20" y="200" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="230" text-anchor="middle">report.now</text>
  <text class="d-sub" x="120" y="252" text-anchor="middle">copied by from import</text>
  <rect class="d-box-accent" x="460" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="560" y="60" text-anchor="middle">fake now()</text>
  <text class="d-sub" x="560" y="82" text-anchor="middle">the patch</text>
  <rect class="d-box-muted" x="460" y="200" width="200" height="70" rx="10"/>
  <text class="d-text" x="560" y="230" text-anchor="middle">real now()</text>
  <text class="d-sub" x="560" y="252" text-anchor="middle">original function</text>
  <path class="d-edge-accent" d="M 228 65 L 452 65" marker-end="url(#py19q4-arrow)"/>
  <path class="d-edge" d="M 228 235 L 452 235" marker-end="url(#py19q4-arrow)"/>
  <path class="d-edge-dashed" d="M 228 90 L 452 215" marker-end="url(#py19q4-arrow)"/>
  <text class="d-sub d-accent" x="340" y="50" text-anchor="middle">rebound</text>
  <text class="d-sub" x="340" y="222" text-anchor="middle">unchanged</text>
</svg>

The dashed line is where \`clock.now\` used to point. Example 1 shows the same with a plain variable (\`tax = pricing.tax\`, then patch \`pricing.tax\`: the copy printed \`20.0\`, the module attribute \`0\`). Example 2 does it with real imports and \`mock.patch\`:

~~~text
copied: REAL-TIME
looked up: FAKE
copied: FAKE
~~~

The first two lines ran with \`clock.now\` patched: \`stamp_copied()\` uses the copied \`report.now\` and still got the real function, while \`stamp_looked_up()\` calls \`clock.now()\` and saw the patch. The third line ran with \`report.now\` patched instead, and now the copied name was faked.

The rule from the \`unittest.mock\` docs is therefore: **patch where the object is looked up, not where it is defined.** (Why \`from\` creates a separate name: [the import system](/interview-question/how-does-the-python-import-system-work).)

## 5. Doing It Safely: \`unittest.mock.patch\`

Manual patching has a flaw: if the code between "patch" and "restore" raises, the restore line never runs and the patch leaks into every later test. \`unittest.mock.patch\` fixes that by being a context manager and a decorator.

📌 **Interview term: unittest.mock.patch** — replaces an attribute, named by a dotted string, with a \`MagicMock\` (or a value you give) for the duration of a \`with\` block or a decorated function, then restores the original, even when the body raises. \`mock\` joined the standard library as \`unittest.mock\` in Python 3.3 via [PEP 417](https://peps.python.org/pep-0417/), which notes that safely patching and un-patching is "hard to do safely" by hand.

<svg class="iq-diagram" width="100%" viewBox="0 0 990 156" role="img" aria-label="A safe patch saves the original, swaps in the replacement, runs the code, and always restores the original">
  <defs>
    <marker id="py19q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">save original</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">keep a reference</text>
  <path class="d-edge-accent" d="M 198 88 L 270 88" marker-end="url(#py19q4-arrow2)"/>
  <text class="d-sub d-accent" x="234" y="72" text-anchor="middle">then</text>
  <rect class="d-box-accent" x="280" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="365" y="72" text-anchor="middle">swap in fake</text>
  <text class="d-sub" x="365" y="96" text-anchor="middle">setattr on target</text>
  <path class="d-edge-accent" d="M 458 88 L 530 88" marker-end="url(#py19q4-arrow2)"/>
  <text class="d-sub d-accent" x="494" y="72" text-anchor="middle">then</text>
  <rect class="d-box" x="540" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="625" y="72" text-anchor="middle">run code</text>
  <text class="d-sub" x="625" y="96" text-anchor="middle">the test body</text>
  <path class="d-edge-accent" d="M 718 88 L 790 88" marker-end="url(#py19q4-arrow2)"/>
  <text class="d-sub d-accent" x="754" y="72" text-anchor="middle">finally</text>
  <rect class="d-box-accent" x="800" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="885" y="72" text-anchor="middle">restore</text>
  <text class="d-sub" x="885" y="96" text-anchor="middle">even on error</text>
</svg>

From Example 2:

- **Restore on error.** A \`RuntimeError\` raised inside \`with mock.patch("clock.now", ...)\` did not leave the patch behind: \`clock.now()\` printed \`REAL-TIME\` afterwards. (Context managers in general: [what a context manager is](/interview-question/what-is-a-context-manager).)
- 📌 **Interview term: patch.object** — \`mock.patch.object(Mailer, "send")\` patches an attribute on an object you already hold. The mock also records calls: \`call_count\` was \`2\` and \`call_args_list\` was \`[call('ada', 'hi ada'), call('alan', 'hi alan')]\`.
- **As a decorator**, the mock is passed into the test function as an extra argument.
- 📌 **Interview term: autospec** — \`autospec=True\` makes the fake copy the real signature. Calling \`Mailer().send("ada")\` without \`body\` raised \`TypeError: missing a required argument: 'body'\`; a plain \`MagicMock\` would have accepted it and the test would have passed wrongly.

pytest offers the same idea as its \`monkeypatch\` fixture (\`monkeypatch.setattr(obj, "name", value)\`, undone after each test). It is a third-party tool, so it is not run on this page. Testing in general: [unittest and pytest](/interview-question/how-do-you-write-tests-in-python-with-unittest-and-pytest).

## 6. What You Cannot Patch

~~~text
TypeError: cannot set 'shout' attribute of immutable type 'str'
TypeError: cannot set '__add__' attribute of immutable type 'int'
~~~

📌 **Interview term: Immutable type** — built-in types implemented in C, such as \`str\`, \`int\`, \`list\` and \`dict\`, reject attribute assignment on the type (3.11 and 3.12 printed the messages above). You can still patch the *names* a module uses, such as \`builtins.open\` or \`mymodule.time\`, but not the methods of \`str\` itself. Other languages, like Ruby, allow reopening core classes; Python deliberately does not.

Also note that patching a special method on an **instance** has no effect on the built-ins: after \`v.__len__ = lambda: 5\`, our run printed \`len(v)\` as \`1\` (the class version) while \`v.__len__()\` gave \`5\`, because Python looks special methods up on the type (see [dunder methods](/interview-question/what-are-dunder-magic-methods)).

## 7. When It Is Acceptable, and When It Is Not

| Situation | Verdict | Why |
| :--- | :--- | :--- |
| Tests replacing the clock, network, randomness or email | fine, use \`mock.patch\` / \`monkeypatch\` | scoped, restored automatically |
| Emergency fix for a bug in a third-party library | acceptable as a temporary, documented shim | pin the version and remove the patch when upstream fixes it |
| Libraries that patch the stdlib on purpose (gevent's \`monkey.patch_all()\` makes sockets cooperative) | acceptable, opt-in, done once at start-up | the patch is the library's whole design |
| Changing behaviour of your own code in production | avoid | use dependency injection, a subclass or a wrapper |
| Patching inside a library you publish | avoid | it changes behaviour for every user of the patched module |

📌 **Interview term: Dependency injection** — passing a collaborator (a clock, a mailer, an HTTP client) into a function or constructor instead of reaching for a global. Tests then pass a fake directly and nothing needs patching. A related design discussion is [composition versus inheritance](/interview-question/what-is-composition-versus-inheritance).

## 8. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs matched. Example 2 also matched on python3.13.

**Example 1 — patching a class, an instance and a module, and the import trap** prints:

~~~text
HELLO! HELLO! HELLO!
TypeError: shy() missing 1 required positional argument: 'self'
HELLO! hi...
True False
hello hello
120.0
100
20.0 0
TypeError: cannot set 'shout' attribute of immutable type 'str'
TypeError: cannot set '__add__' attribute of immutable type 'int'
~~~

**Example 2 — \`unittest.mock.patch\` done right** prints:

~~~text
copied: REAL-TIME
looked up: FAKE
copied: FAKE
REAL-TIME
2
2
[call('ada', 'hi ada'), call('alan', 'hi alan')]
test passed
TypeError: missing a required argument: 'body'
~~~

**What the output shows:**

- A class patch reached instances created before it; an instance patch needed \`MethodType\`; \`del b.hello\` and restoring the class attribute undid both.
- \`pricing.total(100)\` went from \`120.0\` to \`100\` and back, because \`total\` reads \`tax\` at call time.
- A copied reference (\`tax\`, or \`report.now\`) ignored a patch of the original module's name.
- \`mock.patch\` restored the original after an exception, recorded calls, and with \`autospec\` rejected a call with a missing argument.

## Common Pitfalls

- **Patching the definition site instead of the lookup site.** \`from x import f\` means you must patch the importing module's \`f\`.
- **Forgetting to restore.** A manual patch without \`try\`/\`finally\` leaks into every later test when the test fails; use \`mock.patch\` or \`monkeypatch\`.
- **Assigning a function to an instance and expecting \`self\`.** Use \`types.MethodType\`, or patch the class.
- **Mocks without \`autospec\`.** A plain \`MagicMock\` accepts any arguments and any attribute name, so a test can pass while the real call would fail.
- **Patch order and import time.** A module that runs code at import (or caches a value at import) may have already used the original before your patch is applied.
- **Patches that outlive their reason.** A production hotfix for a library bug silently breaks, or silently undoes a fix, when the library is upgraded.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">Monkey patching is changing an attribute of a class, instance or module at run time, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Greeter.hello = new_hello</code>, without touching its source. It works because Python looks attributes up when they are used, and classes and modules are ordinary mutable objects.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Scope:</strong> <span style="color:#f0e2c8;">Patch the class and every instance, old and new, sees it. Patch one instance and only it changes, but you need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types.MethodType</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> is bound. Patch a module and only code that reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.name</code> at call time sees it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The trap:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from clock import now</code> copies a reference into the importing module, so patching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clock.now</code> does nothing there. The rule for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mock.patch</code>: patch the name where it is looked up, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">report.now</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Where it is fine:</strong> <span style="color:#f0e2c8;">Tests. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unittest.mock.patch</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patch.object</code> (stdlib since 3.3) or pytest <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">monkeypatch</code> swap a dependency and restore it automatically, even when the test fails. Elsewhere: an emergency hotfix of a third-party bug, or libraries like gevent.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it is a smell:</strong> <span style="color:#f0e2c8;">It is global and invisible: other code changes behaviour with no sign at the call site, it depends on import order, and library upgrades break it silently. Built-in types like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> cannot be patched at all. Prefer dependency injection or a subclass.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does assigning a function to an instance attribute not give it <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">self</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Binding happens through the descriptor protocol when a function is found on the class. A function stored in the instance <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code> is returned as is, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b.hello()</code> called <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shy()</code> with no arguments and raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: shy() missing 1 required positional argument: 'self'</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types.MethodType(shy, b)</code> creates the bound method by hand.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does "patch where it is looked up" mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mock.patch("pkg.mod.name")</code> replaces the attribute <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name</code> on module <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pkg.mod</code>. If the code under test did <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from clock import now</code>, it reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">report.now</code>, so you patch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">report.now</code>; patching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clock.now</code> only helps code that calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clock.now()</code>. Example 2 shows both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">mock.patch</code> guarantee the original comes back?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a context manager and decorator: it saves the original on entry and restores it in its exit step, which runs even when the body raises. Example 2 raises inside the patch and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">clock.now()</code> still returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REAL-TIME</code> afterwards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you monkey patch <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">str</code> or <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Built-in and other static types are immutable: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str.shout = ...</code> raised <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: cannot set 'shout' attribute of immutable type 'str'</code> on 3.11 and 3.12. You can patch the name a module uses, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.open</code>, but not the built-in type itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the alternative to monkey patching in production code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Make the dependency explicit: pass it in as a parameter or constructor argument (dependency injection), subclass and override, or wrap the object. Then tests pass a fake directly and nothing global changes.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Monkey patching** | replacing or adding attributes on a class, instance or module at run time without editing its source |
| **Late binding (of names)** | Python looks a name up when the code runs, so rebinding it changes later calls |
| **Bound method** | a function combined with an instance, created when a function is found on the class; \`self\` is filled in |
| **types.MethodType** | builds a bound method by hand, used to attach a function to a single instance |
| **unittest.mock.patch** | a context manager/decorator that swaps an attribute for a \`Mock\` and restores it afterwards |
| **patch.object** | the variant of \`patch\` that takes the target object and attribute name directly |
| **autospec** | a \`patch\` option that makes the fake copy the real signature, so wrong calls fail |
| **Dependency injection** | passing collaborators in as arguments instead of reaching for globals, the usual alternative to patching |
| **Immutable type** | a built-in type such as \`str\` or \`int\` whose attributes cannot be set |

---
**Conclusion:** Monkey patching is reassigning an attribute of a class, instance or module while the program runs, and it works because Python objects are mutable and names are looked up at call time. Patch a class and every instance follows; patch one instance and you must bind \`self\` with \`types.MethodType\`; patch a module and only code that reads \`module.name\` sees it, which is why \`from\` imports and \`mock.patch\` targets trip people up. In tests, \`unittest.mock.patch\` (with \`autospec\`) or pytest \`monkeypatch\` make it safe and automatic; in production code it is a last resort, and dependency injection is usually the better design.`,
    examples: [
      { label: `Patching a class, an instance and a module, and the from-import trap`, code: `import types

class Greeter:
    def hello(self):
        return "hello"

a = Greeter()
b = Greeter()

# 1. Patch the CLASS: every instance, old and new, sees it.
original = Greeter.hello
def loud_hello(self):
    return original(self).upper() + "!"
Greeter.hello = loud_hello
print(a.hello(), b.hello(), Greeter().hello())

# 2. Patch ONE instance: a plain function is not bound to it...
def shy(self):
    return "hi..."
b.hello = shy
try:
    b.hello()
except TypeError as e:
    print("TypeError:", e)

# ...wrap it with types.MethodType so self is passed in.
b.hello = types.MethodType(shy, b)
print(a.hello(), b.hello())
print("hello" in vars(b), "hello" in vars(a))

# Undo both patches
del b.hello
Greeter.hello = original
print(a.hello(), b.hello())  # hello hello

# 3. Patch a MODULE attribute. Build a tiny module to keep it self-contained.
pricing = types.ModuleType("pricing")
exec("def tax(amount):\\n    return round(amount * 0.20, 2)\\n"
     "def total(amount):\\n    return amount + tax(amount)\\n", pricing.__dict__)

print(pricing.total(100))  # 120.0
saved = pricing.tax
pricing.tax = lambda amount: 0           # total() looks tax up at call time
print(pricing.total(100))
pricing.tax = saved

# 4. The from-import trap: a copied name keeps pointing at the old object.
tax = pricing.tax                        # same as "from pricing import tax"
pricing.tax = lambda amount: 0
print(tax(100), pricing.tax(100))
pricing.tax = saved

# 5. Built-in types are closed for patching.
try:
    str.shout = lambda self: self.upper()
except TypeError as e:
    print("TypeError:", e)
try:
    int.__add__ = lambda self, other: 42
except TypeError as e:
    print("TypeError:", e)` },
      { label: `unittest.mock.patch: lookup site, restore on error, autospec`, code: `import sys, types
from unittest import mock

# Two tiny in-memory modules, as if they were clock.py and report.py.
clock = types.ModuleType("clock")
exec("def now():\\n    return 'REAL-TIME'\\n", clock.__dict__)
sys.modules["clock"] = clock

report = types.ModuleType("report")
exec("from clock import now\\n"
     "import clock\\n"
     "def stamp_copied():\\n    return 'copied: ' + now()\\n"
     "def stamp_looked_up():\\n    return 'looked up: ' + clock.now()\\n",
     report.__dict__)
sys.modules["report"] = report

# 1. Patch where the name is LOOKED UP, not where it is defined.
with mock.patch("clock.now", return_value="FAKE"):
    print(report.stamp_copied())
    print(report.stamp_looked_up())

with mock.patch("report.now", return_value="FAKE"):
    print(report.stamp_copied())

# 2. The patch is undone when the block exits, even on an error.
try:
    with mock.patch("clock.now", return_value="FAKE"):
        raise RuntimeError("test failed")
except RuntimeError:
    pass
print(clock.now())  # REAL-TIME

# 3. patch.object on a class + checking how it was called.
class Mailer:
    def send(self, to, body):
        raise ConnectionError("no network in tests")

def notify(mailer, users):
    for u in users:
        mailer.send(u, "hi " + u)
    return len(users)

with mock.patch.object(Mailer, "send") as fake_send:
    print(notify(Mailer(), ["ada", "alan"]))
    print(fake_send.call_count)
    print(fake_send.call_args_list)

# 4. As a decorator: the mock is passed in as an argument.
@mock.patch("clock.now", return_value="2026-01-01")
def test_stamp(fake_now):
    assert report.stamp_looked_up() == "looked up: 2026-01-01"
    fake_now.assert_called_once_with()
    return "test passed"

print(test_stamp())  # test passed

# 5. autospec: the fake keeps the real signature, so typos fail loudly.
with mock.patch.object(Mailer, "send", autospec=True):
    try:
        Mailer().send("ada")             # forgot body
    except TypeError as e:
        print("TypeError:", e)` },
    ],
  },
  {
    title: `What is the __hash__ and __eq__ contract?`,
    difficulty: "medium",
    seoDescription: `The Python __hash__ and __eq__ contract: equal objects must hash equal, why __eq__ alone removes __hash__, mutable keys, dataclasses, dict lookup.`,
    description: `**Question presented to candidate:**
"If I write a class and want to use its instances as dictionary keys or put them in a set, what do \`__eq__\` and \`__hash__\` have to do, and what goes wrong if they disagree?"

**What a strong answer should cover:**
- The contract: if \`a == b\` then \`hash(a) == hash(b)\`; the reverse is not required (collisions are allowed). A hash must also stay the same for the object's whole life while it is in a set or dict.
- Defaults: plain objects compare and hash by identity. Defining \`__eq__\` without \`__hash__\` makes Python 3 set \`__hash__ = None\`, so instances become unhashable (\`TypeError: unhashable type\`).
- How dicts and sets use it: hash picks the slot, then identity is checked, then \`__eq__\`; breaking the contract gives silent duplicates or lookups that miss.
- Implement both from the same immutable fields: \`__eq__\` compares a tuple of fields (returning \`NotImplemented\` for other types), \`__hash__\` returns \`hash()\` of the same tuple; mutable objects should not be hashable.
- Tools and details: \`@dataclass(frozen=True)\` generates both, \`eq=True\` alone removes the hash, \`unsafe_hash=True\` is risky; \`1 == 1.0 == True\` share a hash; string hashes are randomised per process (default since 3.3).

**Clarifying questions expected:**
- Will the objects be mutated after they are added to a set or used as keys?

**Code / implementation expected:** Yes — a value class with consistent \`__eq__\`/\`__hash__\`, and a demonstration of what breaks when the contract is violated or a key is mutated.`,
    answer: `**Target Audience:** Developers who have hit \`TypeError: unhashable type\` or want their own class as a dict key, up to candidates who need to explain how dicts use the two methods.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3); Example 2 was also run on 3.13 with the same output.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A big coat check has a thousand numbered hooks. When you hand in your coat, the attendant does not search all thousand hooks; they look at the colour of your ticket, which tells them which row of ten hooks to check, and then compare tickets only within that row.

That only works if **the same coat always gets the same colour ticket.** If two attendants used different colour rules for identical tickets, your coat would be hung in row 3 and searched for in row 7, and you would be told it is not there. And if someone repainted your ticket after you handed in the coat, same result.

Python's \`dict\` and \`set\` are that coat check. The colour is the **hash**, the "are these the same ticket?" check is **\`__eq__\`**, and the rule that keeps the whole system working is the **hash/eq contract**. Get it wrong in your own class and you do not get an error; you get a set with duplicates or a dictionary that "loses" keys.

## 2. The Two Methods

📌 **Interview term: Hash** — an integer computed from an object by \`hash(obj)\`, which calls \`type(obj).__hash__\`. Dicts and sets use it to decide where in their internal array to store and look for the object.

📌 **Interview term: Hash table** — the array of slots behind \`dict\` and \`set\`. The hash narrows the search to a few slots so lookup is O(1) on average. (Implementation details: [how dictionaries are implemented](/interview-question/how-are-python-dictionaries-implemented-and-ordered) and [how a set finds items](/interview-question/how-does-a-python-set-find-items).)

\`__eq__(self, other)\` answers "do these two objects mean the same value?" and is what \`==\` calls. (\`==\` versus \`is\`: [the difference between == and is](/interview-question/what-is-the-difference-between-and-is).)

📌 **Interview term: Hash contract** — **if \`a == b\`, then \`hash(a) == hash(b)\`.** The reverse is not required. In addition, an object's hash must not change while it is stored in a set or used as a dict key.

📌 **Interview term: Hash collision** — two objects that are *not* equal but have the same hash. That is allowed and expected (there are more possible values than integers); the table simply compares them with \`__eq__\`.

📌 **Interview term: Hashable** — an object whose hash never changes during its lifetime and whose \`__eq__\` agrees with it. Immutable built-ins (\`int\`, \`str\`, \`tuple\` of hashables, \`frozenset\`) are hashable; \`list\`, \`dict\` and \`set\` are not (\`hash([1, 2])\` raised \`TypeError: unhashable type: 'list'\`). (Background: [mutable and immutable types](/interview-question/what-are-mutable-and-immutable-types-in-python).)

## 3. How a Dict Actually Uses Them

<svg class="iq-diagram" width="100%" viewBox="0 0 990 156" role="img" aria-label="A dict lookup computes the hash, finds the slot, compares stored hash values, tries identity, and only then calls eq">
  <defs>
    <marker id="py19q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">hash(key)</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">pick a slot</text>
  <path class="d-edge-accent" d="M 198 88 L 270 88" marker-end="url(#py19q5-arrow)"/>
  <text class="d-sub d-accent" x="234" y="72" text-anchor="middle">probe</text>
  <rect class="d-box" x="280" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="365" y="72" text-anchor="middle">same hash?</text>
  <text class="d-sub" x="365" y="96" text-anchor="middle">stored value</text>
  <path class="d-edge-accent" d="M 458 88 L 530 88" marker-end="url(#py19q5-arrow)"/>
  <text class="d-sub d-accent" x="494" y="72" text-anchor="middle">if yes</text>
  <rect class="d-box-muted" x="540" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="625" y="72" text-anchor="middle">same object?</text>
  <text class="d-sub" x="625" y="96" text-anchor="middle">is check</text>
  <path class="d-edge-accent" d="M 718 88 L 790 88" marker-end="url(#py19q5-arrow)"/>
  <text class="d-sub d-accent" x="754" y="72" text-anchor="middle">if no</text>
  <rect class="d-box-accent" x="800" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="885" y="72" text-anchor="middle">__eq__</text>
  <text class="d-sub" x="885" y="96" text-anchor="middle">last resort</text>
</svg>

To find a key, CPython computes its hash, jumps to the matching slot, and for each entry it finds there:

1. compares the **stored hash** with the new one; different hash means "not this one", **no \`__eq__\` call**;
2. checks **identity** (\`is\`); the same object counts as a match, **no \`__eq__\` call**;
3. only then calls **\`__eq__\`**.

Example 2 counts the \`__eq__\` calls to prove it: looking up with the same key object made **0** calls, with an equal copy **1** call, and with a key whose hash differed **0** calls.

📌 **Interview term: Identity** — being the very same object (\`a is b\`). It is the default meaning of \`==\` for your classes, and the shortcut dicts, sets and \`in\` take before calling \`__eq__\`. That shortcut is why \`nan in [nan]\` printed \`True\` even though \`nan == nan\` is \`False\`, while \`float("nan") in [nan]\` (a different NaN object) printed \`False\`.

Now it is clear why the contract exists: if two equal objects had different hashes, step 1 would reject the match before \`__eq__\` was ever asked.

## 4. The Default, and the Trap

A plain class compares by identity and hashes by identity, which is consistent: two separate \`Plain(1)\` objects are unequal and a set keeps both.

Define \`__eq__\` and the default hash would become wrong (equal objects, different identity hashes). So Python 3 removes it:

~~~text
None
TypeError: unhashable type: 'OnlyEq'
~~~

That is \`OnlyEq.__hash__\` printed as \`None\`, and then \`{OnlyEq(1)}\` failing. The same happens to a subclass: \`Child(Base)\` that overrides \`__eq__\` gets \`__hash__ = None\` even though \`Base\` had one. If the inherited hash really does match the new equality, say so explicitly with \`__hash__ = Base.__hash__\` (Example 2's \`FixedChild\`).

## 5. The Recipe

~~~python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)

    def __hash__(self):
        return hash((self.x, self.y))
~~~

Three rules make it correct:

- **Same fields in both.** Whatever \`__eq__\` compares, \`__hash__\` hashes, and nothing else. Hashing a tuple of the fields is the standard way to combine them.
- 📌 **Interview term: NotImplemented** — return it from \`__eq__\` for types you do not handle, so Python can ask the other operand; if both decline, \`==\` falls back to identity (our run of a class whose \`__eq__\` always returns \`NotImplemented\` gave \`p == p\` as \`True\` and \`p == P()\` as \`False\`). Do not return \`False\` blindly and do not raise.
- **Do not mutate the fields afterwards.** Either make them read-only (properties, \`__slots__\`, a frozen dataclass) or do not make the class hashable at all.

## 6. Breaking the Contract: What You See

**Equal but different hashes.** \`BadHash\` returns \`id(self)\` as its hash while \`__eq__\` compares fields. \`BadHash(1, 2) == BadHash(1, 2)\` is \`True\`, yet a set of the two has length **2**. No error, just a wrong answer.

**Mutating a key.**

<svg class="iq-diagram" width="100%" viewBox="0 0 870 156" role="img" aria-label="A key inserted with hash of 0 0 is stored in that slot; after mutation the lookup hashes 99 0 and searches a different slot">
  <defs>
    <marker id="py19q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="210" height="76" rx="10"/>
  <text class="d-text" x="125" y="72" text-anchor="middle">insert Point(0, 0)</text>
  <text class="d-sub" x="125" y="96" text-anchor="middle">slot for hash (0, 0)</text>
  <path class="d-edge-accent" d="M 238 88 L 320 88" marker-end="url(#py19q5-arrow2)"/>
  <text class="d-sub d-accent" x="279" y="72" text-anchor="middle">then</text>
  <rect class="d-box-accent" x="330" y="40" width="210" height="76" rx="10"/>
  <text class="d-text" x="435" y="72" text-anchor="middle">k.x = 99</text>
  <text class="d-sub" x="435" y="96" text-anchor="middle">hash would change</text>
  <path class="d-edge-accent" d="M 548 88 L 630 88" marker-end="url(#py19q5-arrow2)"/>
  <text class="d-sub d-accent" x="589" y="72" text-anchor="middle">then</text>
  <rect class="d-box-muted" x="640" y="40" width="210" height="76" rx="10"/>
  <text class="d-text" x="745" y="72" text-anchor="middle">k in d</text>
  <text class="d-sub" x="745" y="96" text-anchor="middle">searches wrong slot</text>
</svg>

Example 1 inserts \`k = Point(0, 0)\` into a dict and then sets \`k.x = 99\`. Afterwards \`k in d\` is \`False\` (it now hashes to a different slot), \`Point(0, 0) in d\` is also \`False\` (right slot, but the stored key is no longer equal to it), and \`list(d)\` still shows \`[Point(99, 0)]\`. The entry is in the dict, but no key can reach it.

## 7. Built-in Types Keep the Contract Across Types

- \`1 == 1.0 == True\`, so their hashes are equal too, and \`{1: "int", 1.0: "float", True: "bool"}\` printed \`{1: 'bool'}\`: one key (the first one inserted keeps its place), whose value was overwritten twice. ([Built-in data types](/interview-question/what-are-python-s-built-in-data-types).)
- \`hash(-1)\` is \`-2\`, the same as \`hash(-2)\`. In CPython the C-level hash function uses \`-1\` to mean "an error occurred", so no object can hash to \`-1\`. A harmless collision, and a nice detail to mention.
- **Integer hashes depend on the platform.** On our 64-bit python3.11, \`sys.hash_info.modulus\` was \`2**61 - 1\` and \`hash(2**61 - 1)\` was \`0\`; a 32-bit build such as the in-page WebAssembly runtime uses a smaller modulus, so the examples never print raw integer hashes.
- **String hashes are randomised per process.** Running \`print(hash("abc"))\` with \`PYTHONHASHSEED=1\` and \`PYTHONHASHSEED=2\` gave two different numbers. Randomisation became the default in Python 3.3 (per [What's New in Python 3.3](https://docs.python.org/3/whatsnew/3.3.html)), [PEP 456](https://peps.python.org/pep-0456/) made SipHash the string hash in 3.4, and in 3.11 the default became SipHash-1-3 (\`sys.hash_info.algorithm\` printed \`siphash13\` on our 3.11; the change is bpo-29410). The practical rule: never store \`hash()\` values in files or databases or send them between processes.

📌 **Interview term: Hash randomisation** — a random seed mixed into \`str\` and \`bytes\` hashes at interpreter start-up, so hash values (and set iteration order of strings) differ between runs. It protects dicts against crafted-collision denial-of-service attacks.

## 8. Dataclasses Do It For You

| Decorator | \`__eq__\` | \`__hash__\` | Safe as a key? |
| :--- | :--- | :--- | :--- |
| \`@dataclass\` (default \`eq=True\`) | generated | set to \`None\` | no, unhashable |
| \`@dataclass(frozen=True)\` | generated | generated from the fields | yes, fields cannot be reassigned |
| \`@dataclass(unsafe_hash=True)\` | generated | generated | only if you never mutate it |
| \`@dataclass(eq=False)\` | inherited (identity) | inherited (identity) | yes, by identity |

Example 2 confirms the rows: \`Mutable.__hash__\` is \`None\`; two \`Frozen(1, 2)\` collapse to one set element and \`hash(Frozen(1, 2)) == hash((1, 2))\` is \`True\` (the generated hash is the hash of the field tuple); assigning to a frozen field raised \`FrozenInstanceError: cannot assign to field 'x'\`; and the \`unsafe_hash\` object was lost from its set after mutation. A field declared with \`field(compare=False)\` is left out of **both** \`__eq__\` and \`__hash__\`, which keeps them in sync. (More in [what dataclasses are](/interview-question/what-are-dataclasses).)

## 9. Verified: Running the Code

Both examples were run with \`python3.11\` and through the page runtime (Pyodide 0.25.1); the outputs matched, and Example 2 matched on python3.13 as well. The examples print only comparisons of hashes, never raw hash values, so they are deterministic on 32-bit and 64-bit builds.

**Example 1 — the contract, the \`__eq__\`-only trap, broken hashes and mutated keys** prints:

~~~text
False True
2
None
TypeError: unhashable type: 'OnlyEq'
True
home
True
2
False
False
[Point(99, 0)]
True True
{1: 'bool'}
-2 -2
True
TypeError: unhashable type: 'list'
~~~

**Example 2 — how dicts call \`__eq__\`, NaN, dataclasses and subclasses** prints:

~~~text
same object, __eq__ calls: 0
equal copy, __eq__ calls: 1
False | __eq__ calls: 0
False True False
None
1
True
FrozenInstanceError: cannot assign to field 'x'
False
True True
None
1
~~~

**What the output shows:**

- Identity defaults keep two \`Plain(1)\` objects apart; \`OnlyEq\` lost its hash.
- \`Point\` deduplicates in a set and works as a key; \`BadHash\` keeps equal duplicates; a mutated key cannot be found by itself or by its old value.
- \`1\`, \`1.0\` and \`True\` collapse into one key, and \`hash(-1)\` equals \`hash(-2)\`.
- Dict lookup called \`__eq__\` only when the hash matched and the object was not the same one.
- Frozen dataclasses are hashable and immutable; \`unsafe_hash\` reintroduces the mutation bug; overriding \`__eq__\` in a subclass removed the inherited hash until it was restored explicitly.

## Common Pitfalls

- **Defining \`__eq__\` and forgetting \`__hash__\`.** The class silently becomes unhashable; you find out when someone puts it in a set.
- **Hashing fields that \`__eq__\` ignores, or vice versa.** Hash a subset of the compared fields if you like (that is still correct, just more collisions), but never a field that equality ignores.
- **Making mutable objects hashable.** Changing a field after insertion makes the key unreachable; use \`frozen=True\` or leave the class unhashable.
- **Returning \`False\` instead of \`NotImplemented\`** from \`__eq__\` for foreign types, which stops the other operand from answering.
- **Persisting \`hash()\` values.** String hashes change between processes, and integer hashes differ between 32-bit and 64-bit builds.
- **A constant \`__hash__\` "to make it work".** It is correct but turns every dict or set operation on those objects into a scan of all colliding keys.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The contract:</strong> <span style="color:#f0e2c8;">Objects that compare equal must have equal hashes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a == b</code> implies <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash(a) == hash(b)</code>. Unequal objects may share a hash; that is just a collision. And the hash must not change while the object is in a set or dict.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">Dicts and sets use the hash to pick a slot, then check identity, then call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code>. If equal objects hash differently they land in different slots, so a set keeps duplicates and a lookup with an equal key misses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The default and the trap:</strong> <span style="color:#f0e2c8;">By default objects compare and hash by identity. Define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> and Python 3 sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{obj}</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: unhashable type</code>. A subclass that overrides <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> loses its parent hash the same way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The recipe:</strong> <span style="color:#f0e2c8;">Compare and hash the same fields: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotImplemented</code> for other types and compares a tuple of fields; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash()</code> of that tuple. Only do it for objects whose fields do not change, or use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass(frozen=True)</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Details:</strong> <span style="color:#f0e2c8;">Mutating a key after insertion loses it in the dict. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.0</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> are equal so they share a hash and one dict key. String hashes are randomised per process, so never persist <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hash()</code> values.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it a problem if two unequal objects have the same hash?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for correctness: it is a collision, and the dict falls back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> to tell them apart. It hurts speed if it happens a lot; returning a constant hash turns every lookup into a linear scan of the colliding keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does Python set <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__hash__</code> to <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">None</code> when you define only <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">__eq__</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the inherited identity hash would break the contract: two objects you just declared equal would almost always hash differently. Making the class unhashable forces you to choose a hash that matches your equality, or to leave it unhashable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why should mutable objects not be hashable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The dict stores the key in the slot chosen by its hash at insert time. If you change a field the hash depends on, the next lookup hashes to a different slot, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">k in d</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> even for the very same object. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> are unhashable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">frozen=True</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">unsafe_hash=True</code> do on a dataclass?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With the default <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eq=True</code>, a dataclass gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__hash__ = None</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">frozen=True</code> blocks assignment and generates a hash from the fields. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unsafe_hash=True</code> generates the hash on a mutable class, which brings the mutated-key bug back; Example 2 shows <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r in s</code> turning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nan</code> be found in a list when <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">nan == nan</code> is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">False</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Containment and dict lookup check identity first, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nan in [nan]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> because it is the same object; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float("nan") in [nan]</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> because it is a different object and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> says no. The identity shortcut also means <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__eq__</code> was never called when we looked up the same key object.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Hash** | an integer computed from an object, used to pick a slot in a dict or set |
| **Hashable** | an object with a hash that never changes during its lifetime and an \`__eq__\` consistent with it |
| **Hash contract** | if \`a == b\` then \`hash(a) == hash(b)\`; equal objects must hash equal |
| **Hash collision** | two unequal objects with the same hash; allowed, resolved by \`__eq__\` |
| **Identity** | being the very same object, tested with \`is\`; the default meaning of \`==\` for user classes |
| **Hash table** | the array of slots behind \`dict\` and \`set\`; the hash picks where to look |
| **NotImplemented** | returned by \`__eq__\` for an unsupported type so Python can try the other operand |
| **Frozen dataclass** | \`@dataclass(frozen=True)\`: immutable fields, generated \`__eq__\` and \`__hash__\` |
| **Hash randomisation** | a per-process random seed for \`str\` and \`bytes\` hashes, so their values differ between runs |

---
**Conclusion:** The contract is one sentence: objects that compare equal must hash equal, and a hash must not change while the object sits in a set or dict. Dicts and sets depend on it because they use the hash to choose a slot, check identity, and only then call \`__eq__\`, so a broken contract shows up as silent duplicates or vanished keys rather than an error. Python protects you by making a class unhashable as soon as you define \`__eq__\` alone; the fix is to hash exactly the fields you compare, keep those fields immutable, return \`NotImplemented\` for foreign types, or let \`@dataclass(frozen=True)\` write both methods for you.`,
    examples: [
      { label: `The contract, the __eq__-only trap, broken hashes and mutated keys`, code: `# 1. Default: equality is identity, and the hash follows identity.
class Plain:
    def __init__(self, x):
        self.x = x

p, q = Plain(1), Plain(1)
print(p == q, p == p)  # False True
print(len({p, q}))  # 2

# 2. Define __eq__ only: Python sets __hash__ to None.
class OnlyEq:
    def __init__(self, x):
        self.x = x
    def __eq__(self, other):
        if not isinstance(other, OnlyEq):
            return NotImplemented
        return self.x == other.x

print(OnlyEq.__hash__)  # None
try:
    {OnlyEq(1)}
except TypeError as e:
    print("TypeError:", e)

# 3. Define both from the SAME fields: works as a set member / dict key.
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __eq__(self, other):
        if not isinstance(other, Point):
            return NotImplemented
        return (self.x, self.y) == (other.x, other.y)
    def __hash__(self):
        return hash((self.x, self.y))
    def __repr__(self):
        return f"Point({self.x}, {self.y})"

print({Point(1, 2), Point(1, 2), Point(3, 4)} == {Point(1, 2), Point(3, 4)})  # True
seen = {Point(1, 2): "home"}
print(seen[Point(1, 2)])  # home

# 4. Break the contract: equal objects, different hashes.
class BadHash(Point):
    def __hash__(self):
        return id(self)            # ignores x and y
print(BadHash(1, 2) == BadHash(1, 2))  # True
print(len({BadHash(1, 2), BadHash(1, 2)}))  # 2

# 5. Mutate a key after inserting it: the entry gets "lost".
k = Point(0, 0)
d = {k: "origin"}
k.x = 99
print(k in d)  # False
print(Point(0, 0) in d)  # False
print(list(d))  # [Point(99, 0)]

# 6. Built-ins keep the contract across types.
print(1 == 1.0 == True, hash(1) == hash(1.0) == hash(True))  # True True
print({1: "int", 1.0: "float", True: "bool"})  # {1: 'bool'}
print(hash(-1), hash(-2))  # -2 -2
print(hash((1, 2)) == hash((1, 2)))  # True
try:
    hash([1, 2])
except TypeError as e:
    print("TypeError:", e)` },
      { label: `How dicts call __eq__, NaN, dataclasses and subclasses`, code: `from dataclasses import dataclass, FrozenInstanceError

# 1. How a dict finds a key: hash first, then identity, then __eq__.
class Key:
    eq_calls = 0
    def __init__(self, name, h):
        self.name, self.h = name, h
    def __hash__(self):
        return self.h
    def __eq__(self, other):
        Key.eq_calls += 1
        return isinstance(other, Key) and self.name == other.name

a = Key("a", 1)
table = {a: "A"}

Key.eq_calls = 0
table[a]                                # same object: identity shortcut
print("same object, __eq__ calls:", Key.eq_calls)

Key.eq_calls = 0
table[Key("a", 1)]                      # equal object, same hash
print("equal copy, __eq__ calls:", Key.eq_calls)

Key.eq_calls = 0
print(Key("a", 2) in table, "| __eq__ calls:", Key.eq_calls)

# 2. NaN is not equal to itself, yet "in" finds the same object.
nan = float("nan")
print(nan == nan, nan in [nan], float("nan") in [nan])

# 3. Dataclasses: eq=True (default) removes the hash.
@dataclass
class Mutable:
    x: int
print(Mutable.__hash__)  # None

@dataclass(frozen=True)
class Frozen:
    x: int
    y: int
print(len({Frozen(1, 2), Frozen(1, 2)}))  # 1
print(hash(Frozen(1, 2)) == hash((1, 2)))  # True
try:
    Frozen(1, 2).x = 5
except FrozenInstanceError as e:
    print("FrozenInstanceError:", e)

# unsafe_hash=True: hashable AND mutable, so the step-5 bug is back.
@dataclass(unsafe_hash=True)
class Risky:
    x: int
r = Risky(1)
s = {r}
r.x = 2
print(r in s)  # False

# A field can be left out of BOTH eq and hash, keeping them in sync.
from dataclasses import field
@dataclass(frozen=True)
class User:
    id: int
    cache: dict = field(default_factory=dict, compare=False)
print(User(7, {"a": 1}) == User(7), hash(User(7, {"a": 1})) == hash(User(7)))  # True True

# 4. A subclass that overrides __eq__ loses the parent hash.
class Base:
    def __hash__(self):
        return 1
class Child(Base):
    def __eq__(self, other):
        return True
print(Child.__hash__)  # None

class FixedChild(Base):
    def __eq__(self, other):
        return True
    __hash__ = Base.__hash__
print(hash(FixedChild()))  # 1` },
    ],
  },
];

export default augments;
