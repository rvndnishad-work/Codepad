/**
 * PYTHON ULTRA — batch 23: Type hints I (how hints work, generics and
 * TypeVar, typing.Self, PEP 695 type parameter syntax, TypeVarTuple and
 * variadic generics). Every example was run on python3.11 and through the
 * page's Pyodide 0.25.1 harness by scripts/verify-python-examples.ts; examples
 * marked runnable: false were run on the interpreter named in their python
 * field. Type-checker output quoted in the answers is from mypy 2.3.1.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `How do type hints work in Python?`,
    difficulty: "medium",
    seoDescription: `Type hints are annotations Python stores but never enforces. How they are evaluated, where they live, and how mypy, pyright and dataclasses use them.`,
    description: `**Question presented to candidate:**
"Walk me through type hints in Python. If I annotate a parameter as \`int\` and pass a string, what happens? Then what are the hints actually for, and who reads them?"

**What a strong answer should cover:**
- Hints are **annotations**: expressions attached to parameters, return values and variables; CPython stores them in \`__annotations__\` and **never enforces them** at runtime
- **Static type checkers** (mypy, pyright) read them without running the code and report mismatches; IDEs use them for completion; this is **gradual typing**, where unannotated code is treated as \`Any\`
- Core vocabulary: \`list[int]\`, \`dict[str, int]\`, \`X | None\` (same as \`Optional[X]\`), \`Callable\`, \`Any\`, \`Literal\`, plus \`TypeVar\` for generics and \`Protocol\` for structural typing
- When annotations are evaluated: eagerly at \`def\` time up to 3.13, as strings with \`from __future__ import annotations\`, lazily by default from 3.14 (PEP 649); \`typing.get_type_hints()\` resolves forward references
- Some libraries do read hints at runtime: \`dataclasses\` builds fields from them, Pydantic and FastAPI validate data with them

**Code / implementation expected:** Optional — annotate a function, pass a wrong type to show nothing happens at runtime, then show what a checker reports or what \`__annotations__\` holds.`,
    answer: `**Target Audience:** Python developers who have seen \`def f(x: int) -> str:\` and want to know what it really does, from the interpreter and from a type checker.
**Difficulty:** Medium
**Python version:** Runtime behaviour checked on CPython 3.11.17 and 3.13, and in the page runner (Pyodide 0.25.1, CPython 3.11.3). Type-checker output is from mypy 2.3.1 (with \`--python-version 3.11\`) and pyright 1.1.414.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You are moving house. You write "KITCHEN — glasses" on a box. The movers do not open the box to check; they carry it wherever they like, and if someone packed shoes in it, nothing stops them. But your friend with the floor plan reads every label *before the truck leaves* and says: "this box says glasses, but you are about to stack it under the piano."

Type hints are those labels. **The Python interpreter is the movers**: it reads the label, files it away, and carries on. **A type checker such as mypy or pyright is the friend with the plan**: it reads all the labels without running anything and warns you about the box that will break. The labels cost you nothing at runtime and catch a whole class of bugs before the code ships.

That split is the entire answer to "how do type hints work", and it is the line interviewers listen for: *hints are not enforced at runtime; tools read them*.

## 2. The Core Idea: An Annotation Is Stored Data

The syntax is a colon after a name and an arrow before the function body:

~~~python
def repeat(text: str, times: int = 2) -> str:
    return text * times

count: int = 0          # a variable annotation
~~~

📌 **Interview term: annotation** — the expression after \`:\` or \`->\`. Python evaluates it (or, from 3.14, keeps a way to evaluate it later) and stores the result in a dict called \`__annotations__\` on the function, class or module. That is all the interpreter does with it.

📌 **Interview term: type hint** — an annotation used to describe a type. The meaning of hints was standardised by PEP 484, which shipped in Python 3.5 with the \`typing\` module ([PEP 484](https://peps.python.org/pep-0484/)); its own text notes that the annotation *syntax* came earlier, from PEP 3107, which left the meaning open. Variable annotations (\`count: int\`) came with PEP 526 in Python 3.6 ([PEP 526](https://peps.python.org/pep-0526/)).

So when you call \`repeat(5, 3)\`, Python never looks at \`str\`. It runs \`5 * 3\` and returns \`15\`. Example 1 shows exactly that, plus what \`__annotations__\` holds:

~~~text
ababab
15
[0, 0, 0]
{'text': <class 'str'>, 'times': <class 'int'>, 'return': <class 'str'>}
~~~

Two details people get wrong:

- **\`count: int\` with no value creates no variable.** It only adds \`'count'\` to the module \`__annotations__\`. Our run printed \`False\` for \`"count" in globals()\`. In a class body, \`name: str\` without a default does not create a class attribute either: \`hasattr(User, "name")\` was \`False\`.
- **The annotation is a real expression.** On 3.11 a misspelled name in a hint raises \`NameError\` the moment the \`def\` runs (\`NameError: name 'UndefinedName' is not defined\` in our run), even if the function is never called.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 300" role="img" aria-label="The same annotated source file goes two ways: the interpreter stores the hints and runs the code, a type checker reads the hints and reports errors without running it">
  <defs>
    <marker id="py23q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="115" width="190" height="70" rx="10"/>
  <text class="d-text" x="115" y="146" text-anchor="middle">app.py with hints</text>
  <text class="d-sub" x="115" y="168" text-anchor="middle">def f(x: int) -> str</text>
  <rect class="d-box" x="300" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="400" y="61" text-anchor="middle">CPython runs it</text>
  <text class="d-sub" x="400" y="83" text-anchor="middle">at run time</text>
  <rect class="d-box-muted" x="570" y="30" width="190" height="70" rx="10"/>
  <text class="d-text" x="665" y="61" text-anchor="middle">__annotations__</text>
  <text class="d-sub" x="665" y="83" text-anchor="middle">stored, not checked</text>
  <rect class="d-box-accent" x="300" y="200" width="200" height="70" rx="10"/>
  <text class="d-text" x="400" y="231" text-anchor="middle">mypy or pyright</text>
  <text class="d-sub" x="400" y="253" text-anchor="middle">before run time</text>
  <rect class="d-box-accent" x="570" y="200" width="190" height="70" rx="10"/>
  <text class="d-text" x="665" y="231" text-anchor="middle">error report</text>
  <text class="d-sub" x="665" y="253" text-anchor="middle">code never runs</text>
  <path class="d-edge" d="M 210 135 L 294 75" marker-end="url(#py23q1-arrow)"/>
  <path class="d-edge-accent" d="M 210 165 L 294 225" marker-end="url(#py23q1-arrow)"/>
  <path class="d-edge" d="M 500 65 L 564 65" marker-end="url(#py23q1-arrow)"/>
  <path class="d-edge-accent" d="M 500 235 L 564 235" marker-end="url(#py23q1-arrow)"/>
</svg>

One file, two readers. The interpreter (top) evaluates each hint, files it in \`__annotations__\` and runs the code regardless. The type checker (bottom) never executes anything: it reads the hints and the code and reports where they disagree.

## 3. What a Type Checker Adds

📌 **Interview term: static type checker** — a program that analyses source code without running it, infers the type of every expression, and reports where a value cannot match its hint. mypy and pyright are the two common ones.

Here is a small file and what mypy 2.3.1 says about it:

~~~python
def repeat(text: str, times: int = 2) -> str:
    return text * times

def find(items: list[int], target: int) -> int | None:
    return items.index(target) if target in items else None

repeat(5, 3)
position = find([10, 20], 20)
print(position + 1)
if position is not None:
    print(position + 1)

def untyped(x):
    return x.anything_at_all()

reveal_type(find)
~~~

~~~text
hints_demo.py:7: error: Argument 1 to "repeat" has incompatible type "int"; expected "str"  [arg-type]
hints_demo.py:9: error: Unsupported operand types for + ("None" and "int")  [operator]
hints_demo.py:9: note: Left operand is of type "int | None"
hints_demo.py:16: note: Revealed type is "def (items: list[int], target: int) -> int | None"
Found 2 errors in 1 file (checked 1 source file)
~~~

Three things to notice:

1. **Line 7** is the \`repeat(5, 3)\` call that ran happily at runtime. The checker flags it.
2. **Line 9 vs line 11.** \`find\` can return \`None\`, so \`position + 1\` is an error. Inside \`if position is not None:\` the same expression is fine. 📌 **Interview term: narrowing** — the checker refines \`int | None\` to \`int\` after a check such as \`is not None\` or \`isinstance\`.
3. **\`untyped\` (line 13) produced no error** even though it calls a method on anything. 📌 **Interview term: gradual typing** — unannotated code is treated as \`Any\` and mypy, by default, does not check the bodies of unannotated functions. You can add hints one module at a time; \`Any\` is compatible with every type in both directions.

\`reveal_type(expr)\` is a checker-only helper: mypy prints the type it inferred. Python 3.11 also has \`typing.reveal_type\` at runtime: \`reveal_type(3)\` wrote \`Runtime type is 'int'\` to stderr in our run. It is a debugging aid, not part of normal code.

pyright 1.1.414 reports the same two errors, with its own wording (\`Argument of type "Literal[5]" cannot be assigned to parameter "text" of type "str"\` and \`Operator "+" not supported for "None"\`).

## 4. The Vocabulary of Hints

| You write | Meaning | Notes |
| :--- | :--- | :--- |
| \`int\`, \`str\`, \`User\` | an instance of that class (or a subclass) | any class works as a hint |
| \`list[int]\`, \`dict[str, float]\`, \`tuple[int, str]\`, \`tuple[int, ...]\` | containers with element types | built-in generics since 3.9 ([PEP 585](https://peps.python.org/pep-0585/)); before that \`typing.List\` |
| \`int \\| None\`, \`str \\| bytes\` | a union | \`\\|\` since 3.10 ([PEP 604](https://peps.python.org/pep-0604/)); same as \`Optional[int]\`, \`Union[str, bytes]\` |
| \`Callable[[int, str], bool]\` | a function taking \`(int, str)\` and returning \`bool\` | from \`typing\` or \`collections.abc\` |
| \`Any\` | opt out: anything goes, in both directions | the escape hatch of gradual typing |
| \`object\` | any value, but you can only use what every object supports | the safe "anything" |
| \`Literal["r", "w"]\` | exactly these values | useful for mode flags |
| \`Final\`, \`ClassVar\` | must not be reassigned; class-level not instance-level | \`dataclasses\` skips \`ClassVar\` fields |
| \`TypeVar\`, \`Generic\` | a placeholder type that links inputs to outputs | see [generics and TypeVar](/interview-question/what-are-generics-and-typevar-in-python) |
| \`Protocol\` | "anything with these methods" | see [ABCs and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols) |
| \`TypedDict\` | a dict with known keys | see [Unpack and TypedDict for **kwargs](/interview-question/how-do-unpack-and-typeddict-enable-type-safe-kwargs) |
| \`Annotated[float, "unit=m"]\` | a type plus metadata for tools | checkers see \`float\`; libraries read the extra |

These are real objects at runtime. Example 2 shows \`Optional[int] == Union[int, None]\` and \`int | None == Optional[int]\` are both \`True\`, that \`get_origin\` / \`get_args\` take a hint apart (\`<class 'dict'> (<class 'str'>, list[int])\`), and that \`typing.cast(int, "not an int")\` returns the string untouched: \`cast\` only tells the checker what to believe.

## 5. When Are Annotations Evaluated?

This changed over the years, and it is a favourite follow-up.

| Mode | When the hint expression runs | What \`__annotations__\` holds |
| :--- | :--- | :--- |
| Default up to 3.13 | when the \`def\` / \`class\` statement runs | the evaluated objects |
| \`from __future__ import annotations\` ([PEP 563](https://peps.python.org/pep-0563/), since 3.7; the PEP is now marked superseded by PEP 649) | never, by Python | strings, such as \`'list[int]'\` |
| Default from 3.14 (PEP 649 / PEP 749) | lazily, the first time someone asks | the evaluated objects, computed on access |

Example 2 compiles a function with the \`annotations\` future flag and prints \`{'x': 'list[int]', 'return': 'NotDefinedYet'}\`: no \`NameError\`, because nothing was evaluated. Python 3.14 stores annotations in special "annotate functions" and evaluates them on access, and adds the \`annotationlib\` module to read them in different formats ([What is new in Python 3.14](https://docs.python.org/3.14/whatsnew/3.14.html), [annotationlib](https://docs.python.org/3.14/library/annotationlib.html)). The examples on this page were run on 3.11 and 3.13, so they show the eager behaviour.

📌 **Interview term: forward reference** — a hint that names something not defined yet, such as a class referring to itself. Write it as a string (\`-> "Node"\`); \`typing.get_type_hints()\` evaluates such strings later, in the function's module namespace. Example 1 shows \`{'return': 'Node'}\` in \`__annotations__\` but \`{'return': <class '__main__.Node'>}\` from \`get_type_hints\`.

## 6. Who Reads Hints at Runtime

Python ignores hints, but libraries can choose to read them:

- **\`dataclasses\`** turns each annotated class attribute into a field and generates \`__init__\`, \`__repr__\` and \`__eq__\` from them. It does not check the types: \`Item("pen", "cheap")\` happily stored a string price in our run. A \`ClassVar\` annotation is skipped (\`['name', 'price']\`). See [What are dataclasses?](/interview-question/what-are-dataclasses)
- **Pydantic and FastAPI** use hints to validate and convert incoming data, which is where hints do get "teeth" at runtime. See [Pydantic v2 validation](/interview-question/how-does-pydantic-v2-validation-work-basemodel-field-validator-mode).
- **Your own code** can do it too. Example 2 builds a 12-line \`@enforce\` decorator from \`get_type_hints()\` and \`isinstance\`; \`area(3, "4")\` raised \`TypeError: height='4' is not int\`. That works for plain classes only: \`isinstance\` cannot check \`list[int]\` (the next question explains why).

## 7. Verified: Running the Code

Both examples were run on python3.11 and in the page runner (Pyodide 0.25.1). Example 1, *hints are stored, not enforced*, printed:

~~~text
ababab
15
[0, 0, 0]
{'text': <class 'str'>, 'times': <class 'int'>, 'return': <class 'str'>}
(2,)
False
{'count': <class 'int'>}
{'name': <class 'str'>, 'age': <class 'int'>}
False 0
NameError: name 'UndefinedName' is not defined
{'return': 'Node'}
{'return': <class '__main__.Node'>}
~~~

Example 2, *hint objects at runtime*, printed:

~~~text
True
True
<class 'dict'> (<class 'str'>, list[int])
True
not an int
['name', 'price']
Item(name='pen', price='cheap')
12
TypeError: height='4' is not int
{'distance': <class 'float'>, 'return': <class 'NoneType'>}
('unit=m',)
{'x': 'list[int]', 'return': 'NotDefinedYet'}
~~~

The mypy and pyright output in section 3 came from running each tool on \`hints_demo.py\` as shown.

## Edge Cases Worth Knowing

- **\`None\` as a hint means \`type(None)\`.** \`get_type_hints\` shows \`'return': <class 'NoneType'>\` for \`-> None\`.
- **Default \`None\` does not make a hint optional.** For \`def f(x: int = None)\` mypy 2.3.1 reports \`Incompatible default for parameter "x" (default has type "None", parameter has type "int")\` with the note \`PEP 484 prohibits implicit Optional\`. Write \`x: int | None = None\`.
- **Hints have a small runtime cost on 3.11.** Each one is evaluated when the \`def\` runs and stored in a dict. It is rarely measurable, and \`from __future__ import annotations\` or 3.14 removes even that.
- **Class annotations do not reach instances.** \`User.__annotations__\` describes the class; an instance attribute set in \`__init__\` without an annotation is still inferred by checkers from the assignment.
- **\`isinstance(x, int | str)\` works** since 3.10 (our run printed \`True\`), but \`isinstance(x, list[int])\` raises \`TypeError\`.

## Common Pitfalls

- **Believing hints validate input.** They do not; validate at your program boundary (or use Pydantic) and let the checker cover the inside.
- **Hiding errors with \`Any\`.** An \`Any\` spreads silently: every value derived from it is unchecked too. Prefer \`object\` when you mean "any value".
- **Forgetting \`| None\`.** A function that can return \`None\` but is annotated \`-> int\` lies to every caller, and the checker cannot help them.
- **Annotating \`list[float]\` for a read-only argument.** \`list\` is invariant, so a \`list[int]\` is rejected; take \`Sequence[float]\` or \`Iterable[float]\` instead (explained in [generics and TypeVar](/interview-question/what-are-generics-and-typevar-in-python)).
- **Reading \`__annotations__\` directly for forward references.** You get strings; use \`typing.get_type_hints()\` (or \`annotationlib.get_annotations\` on 3.14).
- **Running no checker at all.** Hints with no mypy or pyright in CI are documentation that slowly goes stale.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they are:</strong> <span style="color:#f0e2c8;">Type hints are annotations on parameters, returns and variables, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def repeat(text: str) -&gt; str</code>. Python evaluates them and stores them in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__annotations__</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Not enforced:</strong> <span style="color:#f0e2c8;">The interpreter never checks them: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">repeat(5, 3)</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">15</code>. Hints change nothing about how the code runs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Who uses them:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Static type checkers</strong> such as mypy and pyright read them without running the code, and IDEs use them for completion. It is <strong style="color:#ffca28;">gradual typing</strong>: unannotated code is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Any</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Vocabulary:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list[int]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict[str, int]</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int | None</code> (same as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Optional[int]</code>), <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Callable</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Literal</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeVar</code> for generics, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Protocol</code> for structural typing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Runtime readers:</strong> <span style="color:#f0e2c8;">A few libraries read hints at runtime: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dataclasses</code> builds fields from them, Pydantic and FastAPI validate with them. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.get_type_hints()</code> to resolve string forward references.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I pass a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">str</code> where <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">int</code> is annotated, what happens?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At runtime, nothing special: the function runs with the string and fails only if an operation does not support it. A type checker reports the call before the code runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">from __future__ import annotations</code> do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stops Python from evaluating annotations: each one is stored as a string, so forward references and names that only exist for the checker do not raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NameError</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.get_type_hints()</code> evaluates them when needed. Python 3.14 makes annotations lazy by default (PEP 649).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Any</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">object</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code> accepts any value but lets you use only what every object supports. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Any</code> turns checking off in both directions: you can do anything with it and pass it anywhere, so errors pass silently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do type hints make Python faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. CPython ignores them when executing. Tools such as mypyc or Cython can compile annotated code, but standard CPython runs annotated and unannotated code the same way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check types at runtime if you need to?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code> for plain classes, or a validation library such as Pydantic that reads the hints. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(x, list[int])</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>, because generic parameters are not kept on objects.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Annotation | The expression after \`:\` or \`->\`; stored in \`__annotations__\` |
| Type hint | An annotation that describes a type (PEP 484) |
| Static type checker | A tool such as mypy or pyright that checks hints without running code |
| Narrowing | The checker refining a type after a check, such as \`int | None\` to \`int\` after \`is not None\` |
| Gradual typing | Mixing typed and untyped code; untyped values are \`Any\` |
| Forward reference | A hint naming something defined later, written as a string and resolved by \`get_type_hints()\` |

**Conclusion:** A type hint is an annotation, an expression Python evaluates (eagerly up to 3.13, lazily from 3.14, or never with the \`annotations\` future import) and stores in \`__annotations__\` without ever checking it: \`repeat(5, 3)\` returns \`15\` even though \`text\` is annotated \`str\`. The value comes from tools. Static checkers such as mypy and pyright read the hints and the code, narrow \`int | None\` after a \`None\` check, and report mismatches before anything runs, while gradual typing lets you add hints one module at a time with \`Any\` as the escape hatch. A few libraries, \`dataclasses\`, Pydantic and FastAPI among them, read the hints at runtime to build fields or validate data, which is the only time a hint changes what a program does.`,
    examples: [
      {
        label: `Hints are stored, not enforced: __annotations__, forward references, evaluation time`,
        code: `from typing import get_type_hints

def repeat(text: str, times: int = 2) -> str:
    return text * times

# 1. Hints are only labels: Python never checks them.
print(repeat("ab", 3))  # ababab
print(repeat(5, 3))  # 15
print(repeat([0], 3))  # [0, 0, 0]

# 2. They are stored as plain data on the function.
print(repeat.__annotations__)
print(repeat.__defaults__)  # (2,)

# 3. A variable annotation with no value creates no variable.
count: int
print("count" in globals())  # False
print(__annotations__)

class User:
    name: str
    age: int = 0

print(User.__annotations__)
print(hasattr(User, "name"), User.age)  # False 0

# 4. On 3.11 annotations are evaluated when the def runs.
try:
    def broken(x: UndefinedName) -> None:
        pass
except NameError as err:
    print("NameError:", err)

# 5. A string annotation is a forward reference;
#    get_type_hints() evaluates it later, when the name exists.
def make_node() -> "Node":
    return Node()

class Node:
    pass

print(make_node.__annotations__)
print(get_type_hints(make_node))`,
      },
      {
        label: `Hint objects at runtime: unions, Annotated, dataclasses, a tiny checker, string annotations`,
        code: `import __future__
import functools
import typing
from dataclasses import dataclass, fields
from typing import Annotated, ClassVar, Optional, Union, get_args, get_origin, get_type_hints

# 1. Hint objects are ordinary values you can inspect.
print(Optional[int] == Union[int, None])  # True
print(int | None == Optional[int])  # True
print(get_origin(dict[str, list[int]]), get_args(dict[str, list[int]]))
print(isinstance(3, int | str))  # True
print(typing.cast(int, "not an int"))  # not an int

# 2. Some libraries read hints at runtime: dataclasses is one.
@dataclass
class Item:
    name: str
    price: float = 0.0
    registry: ClassVar[dict] = {}

print([f.name for f in fields(Item)])  # ['name', 'price']
print(Item("pen", "cheap"))  # Item(name='pen', price='cheap')

# 3. A tiny runtime checker built on get_type_hints().
def enforce(func):
    hints = get_type_hints(func)

    @functools.wraps(func)
    def wrapper(*args):
        for (name, expected), value in zip(hints.items(), args):
            if not isinstance(value, expected):
                raise TypeError(f"{name}={value!r} is not {expected.__name__}")
        return func(*args)
    return wrapper

@enforce
def area(width: int, height: int) -> int:
    return width * height

print(area(3, 4))  # 12
try:
    area(3, "4")
except TypeError as err:
    print("TypeError:", err)

# 4. Annotated attaches metadata that only tools look at.
Meters = Annotated[float, "unit=m"]
def run(distance: Meters) -> None: ...
print(get_type_hints(run))
print(get_type_hints(run, include_extras=True)["distance"].__metadata__)

# 5. from __future__ import annotations stores every hint as a string.
src = "def f(x: list[int]) -> NotDefinedYet: ...\\n"
ns = {}
exec(compile(src, "<demo>", "exec", flags=__future__.annotations.compiler_flag), ns)
print(ns["f"].__annotations__)`,
      },
    ],
  },
  {
    title: `What are generics and TypeVar in Python?`,
    difficulty: "medium",
    seoDescription: `Generics let one function or class work for many types while keeping them linked. TypeVar, Generic, bounds, constraints, variance and type erasure.`,
    description: `**Question presented to candidate:**
"Say I write \`def first(items: list) -> object\`. A caller passes a list of ints and gets back something the type checker only knows is an \`object\`. How do generics and \`TypeVar\` fix that, and what does a generic class look like?"

**What a strong answer should cover:**
- A **type variable** (\`T = TypeVar("T")\`) is a placeholder the checker solves at each call, so \`first(list[int])\` returns \`int\`: it **links** input and output types, which \`Any\` cannot do
- **Generic classes** subclass \`Generic[T]\` (or use \`class Stack[T]:\` on 3.12+); \`Stack[int]\` is checked as a stack of ints
- **Bounds** (\`TypeVar("N", bound=float)\`) allow any subtype and keep it; **constraints** (\`TypeVar("S", str, bytes)\`) allow exactly one of a fixed list
- **Variance**: \`list\` is **invariant** (a \`list[int]\` is not a \`list[float]\`), read-only types like \`Sequence\` are **covariant**; a mutable write is why
- **Type erasure** at runtime: \`Stack[int]()\` is a plain \`Stack\`, the parameter is never checked, and \`isinstance(x, Stack[int])\` raises \`TypeError\`

**Code / implementation expected:** Optional — a generic function such as \`first\` or a small generic container class, ideally with what a type checker infers for it.`,
    answer: `**Target Audience:** Python developers who use type hints and want to write functions and classes that work for many types without falling back to \`Any\`.
**Difficulty:** Medium
**Python version:** Runtime behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3). Type-checker output is from mypy 2.3.1 with \`--python-version 3.11\`. This page uses the \`TypeVar\` spelling that works on every supported version; the 3.12 shorthand is covered in [Python 3.12 type parameter syntax](/interview-question/what-is-python-3-12-s-new-type-parameter-syntax-type-generic-classes).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A coat check gives you a ticket. Hand in a red umbrella, get back a red umbrella; hand in a blue coat, get back that blue coat. The attendant does not care *what* you hand in, but there is one promise: **what comes back is the same kind of thing that went in.**

Now imagine the ticket only said "an item". You hand in an umbrella and the ticket tells you that you will get back "some item", maybe a coat. You would have to check every time. That is a function annotated with \`Any\` or \`object\`: it accepts everything, but the link between input and output is lost.

Generics are the honest ticket. A **type variable** says: "whatever type you hand me, call it \`T\`, and I will hand back a \`T\`." The type checker then fills in \`T\` at every call.

## 2. The Core Idea: a Placeholder the Checker Solves

📌 **Interview term: type variable** — a placeholder for a type, created with \`T = TypeVar("T")\`. Inside one call, every \`T\` in the signature must be the same type. The checker works out what \`T\` is from the arguments; this is called **solving** or **binding** the type variable.

~~~python
from typing import Any, TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]

def first_any(items: list[Any]) -> Any:
    return items[0]
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 780 230" role="img" aria-label="The call first with a list of ints: the checker matches list of T against list of int, binds T to int, so the result is int">
  <defs>
    <marker id="py23q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="115" y="111" text-anchor="middle">first([3, 1])</text>
  <text class="d-sub" x="115" y="133" text-anchor="middle">argument: list[int]</text>
  <rect class="d-box" x="290" y="80" width="200" height="70" rx="10"/>
  <text class="d-text" x="390" y="111" text-anchor="middle">match list[T]</text>
  <text class="d-sub" x="390" y="133" text-anchor="middle">so T = int</text>
  <rect class="d-box-accent" x="570" y="80" width="190" height="70" rx="10"/>
  <text class="d-text" x="665" y="111" text-anchor="middle">result: int</text>
  <text class="d-sub" x="665" y="133" text-anchor="middle">return type T</text>
  <path class="d-edge" d="M 210 115 L 284 115" marker-end="url(#py23q2-arrow)"/>
  <path class="d-edge-accent" d="M 490 115 L 564 115" marker-end="url(#py23q2-arrow)"/>
</svg>

The checker matches the argument type against the parameter hint, fixes \`T\`, and substitutes it into the return type. Nothing of this happens at runtime.

What mypy infers (lines 27 and 28 of the demo file below):

~~~text
generics_demo.py:27: note: Revealed type is "int"
generics_demo.py:28: note: Revealed type is "Any"
~~~

With \`Any\`, the result of \`first_any([3, 1])\` is unchecked: you could call \`.upper()\` on it and nobody would complain. With \`T\`, it is an \`int\`.

## 3. Generic Classes

📌 **Interview term: generic class** — a class parameterised by one or more type variables, written by inheriting from \`Generic[T]\`. Each use, such as \`Stack[int]\`, fixes the parameter for that object.

~~~python
class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
    def pop(self) -> T:
        return self._items.pop()
~~~

\`list\`, \`dict\`, \`set\`, \`tuple\` and the \`collections.abc\` types are all generic in exactly this way, which is why \`list[int]\` works.

## 4. Narrowing What T May Be: Bounds and Constraints

Sometimes "any type" is too loose: \`biggest(a, b)\` needs values that can be compared with \`>=\`.

📌 **Interview term: bound** — \`TypeVar("N", bound=float)\` means "any subtype of \`float\`". The checker still binds \`N\` to the exact type at the call, so \`biggest(3, 7)\` returns \`int\`, not \`float\`.

📌 **Interview term: constrained type variable** — \`TypeVar("S", str, bytes)\` means "exactly \`str\` or exactly \`bytes\`". Unlike a union, both arguments must be the *same* one of the choices.

~~~python
N = TypeVar("N", bound=float)
S = TypeVar("S", str, bytes)

def biggest(a: N, b: N) -> N:
    return a if a >= b else b

def double(x: S) -> S:
    return x + x
~~~

The whole demo file, and what mypy 2.3.1 says about it:

~~~python
from typing import Any, Generic, Sequence, TypeVar

T = TypeVar("T")
N = TypeVar("N", bound=float)
S = TypeVar("S", str, bytes)

def first(items: list[T]) -> T:
    return items[0]

def first_any(items: list[Any]) -> Any:
    return items[0]

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
    def pop(self) -> T:
        return self._items.pop()

def biggest(a: N, b: N) -> N:
    return a if a >= b else b

def double(x: S) -> S:
    return x + x

reveal_type(first([3, 1]))
reveal_type(first_any([3, 1]))
ints = Stack[int]()
ints.push("not an int")
reveal_type(ints.pop())
reveal_type(biggest(3, 7))
biggest("a", "b")
double("ab" if input() else b"ab")
~~~

~~~text
generics_demo.py:27: note: Revealed type is "int"
generics_demo.py:28: note: Revealed type is "Any"
generics_demo.py:30: error: Argument 1 to "push" of "Stack" has incompatible type "str"; expected "int"  [arg-type]
generics_demo.py:31: note: Revealed type is "int"
generics_demo.py:32: note: Revealed type is "int"
generics_demo.py:33: error: Value of type variable "N" of "biggest" cannot be "str"  [type-var]
generics_demo.py:34: error: Value of type variable "S" of "double" cannot be "str | bytes"  [type-var]
Found 3 errors in 1 file (checked 1 source file)
~~~

- Line 30: pushing a \`str\` onto a \`Stack[int]\` is rejected (it ran fine at runtime in Example 1).
- Line 32: \`biggest(3, 7)\` is \`int\`, the bound kept the exact type.
- Line 33: \`str\` is not a subtype of \`float\`, so the bound rejects it.
- Line 34: a value that may be \`str\` *or* \`bytes\` cannot be passed to \`double\`, because \`S\` must be one of them, not the union.

\`int\` passing a \`float\` bound is a typing rule, not inheritance: \`int\` is not a subclass of \`float\`, but PEP 484 says an \`int\` argument is acceptable where \`float\` is annotated ([PEP 484, the numeric tower section](https://peps.python.org/pep-0484/)).

## 5. Variance: Why \`list[int]\` Is Not a \`list[float]\`

This is the part interviewers use to separate memorised answers from understanding.

📌 **Interview term: variance** — how subtyping of the parameter carries over to the generic type. If \`int\` is acceptable as a \`float\`, is \`Box[int]\` acceptable as a \`Box[float]\`?

- **Invariant** (\`list\`, \`dict\`, \`set\`): no. \`list[int]\` and \`list[float]\` are unrelated.
- **Covariant** (\`Sequence\`, \`tuple\`, \`frozenset\`, \`Iterable\`): yes, \`Sequence[int]\` is a \`Sequence[float]\`.
- **Contravariant** (the argument of \`Callable\`): reversed. A function that accepts any \`float\` can be used where a function accepting \`int\` is needed.

Why is \`list\` invariant? Because you can write to it. Example 2 runs the bug that variance prevents:

~~~python
def add_half(numbers: list[float]) -> None:
    numbers.append(0.5)

counts: list[int] = [1, 2]
add_half(counts)      # if this were allowed...
print(counts)         # [1, 2, 0.5]  -- a list[int] holding a float
~~~

A read-only \`Sequence[float]\` parameter cannot append, so letting a \`list[int]\` in is safe. mypy explains this itself:

~~~text
variance_demo.py:12: error: Argument 1 to "add_half" has incompatible type "list[int]"; expected "list[float]"  [arg-type]
variance_demo.py:12: note: "list" is invariant -- see https://mypy.readthedocs.io/en/stable/common_issues.html#variance
variance_demo.py:12: note: Consider using "Sequence" instead, which is covariant
variance_demo.py:16: error: Cannot use a covariant type variable as a parameter  [misc]
Found 2 errors in 1 file (checked 1 source file)
~~~

📌 **Interview term: covariant type variable** — \`TypeVar("T_co", covariant=True)\` marks a parameter that only comes *out* of the class. Using it as a method argument is an error (line 16 above), because accepting values in is what makes a type unsafe to treat covariantly. On 3.12+ you do not declare variance at all: the checker infers it ([details](/interview-question/what-is-python-3-12-s-new-type-parameter-syntax-type-generic-classes)).

| Variance | Rule | Built-in examples | Why |
| :--- | :--- | :--- | :--- |
| Invariant | \`G[int]\` and \`G[float]\` unrelated | \`list\`, \`dict\`, \`set\` | values go in and out |
| Covariant | \`G[int]\` is a \`G[float]\` | \`Sequence\`, \`tuple\`, \`frozenset\`, \`Iterator\` | values only come out |
| Contravariant | \`G[float]\` is a \`G[int]\` | \`Callable\` arguments | values only go in |

## 6. What Exists at Runtime: Type Erasure

📌 **Interview term: type erasure** — the type argument in \`Stack[int]\` is used by the checker and then forgotten. The object is a plain \`Stack\`.

Example 1 shows the details CPython keeps:

- \`T\` is a \`TypeVar\` object whose repr is \`~T\` (\`+T_co\` for covariant, \`-T\` for contravariant).
- \`Stack.__parameters__\` is \`(~T,)\`.
- \`Stack[int]\` is a \`typing\` alias object: \`get_origin\` gives \`Stack\`, \`get_args\` gives \`(int,)\`. Calling it creates a normal \`Stack\`, and stores the alias on the instance as \`__orig_class__\`.
- Nothing checks the argument: \`ints.push("not an int")\` worked and \`pop()\` returned the string.
- \`isinstance(ints, Stack[int])\` raises \`TypeError: Subscripted generics cannot be used with class and instance checks\`; \`isinstance(ints, Stack)\` is \`True\`.

## 7. Verified: Running the Code

Both examples were run on python3.11 and in the page runner (Pyodide 0.25.1). Example 1, *a generic function and a generic Stack*, printed:

~~~text
3 b
2
~T T
(~T,)
__main__.Stack[int] <class '__main__.Stack'> (<class 'int'>,)
Stack
__main__.Stack[int]
True False
not an int
TypeError: Subscripted generics cannot be used with class and instance checks
True
~~~

Example 2, *bounds, constraints and variance*, printed:

~~~text
~T None () False
~N <class 'float'> () False
~S None (<class 'str'>, <class 'bytes'>) False
+T_co None () True
7 2.5
abab b'abab'
[1, 2, 0.5]
3.5
3
~~~

The mypy output in sections 2, 4 and 5 came from running mypy 2.3.1 on the two demo files shown.

## 8. TypeVar Compared With the Alternatives

| Approach | Accepts | Caller gets back | Checks inside the function |
| :--- | :--- | :--- | :--- |
| \`def f(x: Any) -> Any\` | anything | \`Any\`, unchecked | none |
| \`def f(x: object) -> object\` | anything | \`object\`, little you can do | strict |
| \`def f(x: int \\| str) -> int \\| str\` | either | the union, even for an \`int\` argument | strict |
| \`def f(x: T) -> T\` | anything | the exact type passed in | strict |
| \`def f(x: N) -> N\` with \`bound=float\` | subtypes of \`float\` | the exact type passed in | can use \`float\` methods |

## Edge Cases Worth Knowing

- **A TypeVar used once is pointless.** \`def log(x: T) -> None\` links nothing; write \`object\`. mypy warns about the reverse case too: a function that *returns* a TypeVar it never receives.
- **The name must match.** For \`T = TypeVar("U")\` mypy reports \`String argument 1 "U" to TypeVar(...) does not match variable name "T"\`; the string is the name used in reprs and error messages.
- **Generic methods in a generic class** can use extra TypeVars: \`def map(self, f: Callable[[T], U]) -> "Stack[U]"\`.
- **\`Generic[...]\` appears once.** A class can inherit from a normal base and \`Generic[T]\` together, but listing \`Generic[...]\` twice (or combining it with the 3.12 \`class C[T]\` form) raises \`TypeError: Cannot inherit from Generic[...] multiple times.\`
- **Decorators need \`ParamSpec\`.** A TypeVar captures one type; to keep a whole parameter list through a wrapper you use \`ParamSpec\`. For "any number of types in order", see [TypeVarTuple](/interview-question/what-is-typevartuple-and-unpack-for-variadic-generics).
- **Methods returning their own class** are best written with \`Self\`, not a bound TypeVar: see [typing.Self](/interview-question/what-does-typing-self-do-and-why-does-it-beat-typevar-for-methods).

## Common Pitfalls

- **Using \`Any\` where you meant \`T\`.** It compiles, but every caller loses the type and the checker silently stops helping.
- **Expecting \`Stack[int]\` to validate at runtime.** It is erased; validate at the boundary.
- **Annotating read-only parameters as \`list[float]\`.** Callers with \`list[int]\` are rejected; use \`Sequence[float]\` or \`Iterable[float]\`.
- **Confusing a bound with constraints.** \`bound=float\` allows \`int\`, \`bool\` and your own subclass and keeps them; \`TypeVar("S", str, bytes)\` allows only those two, and a \`str | bytes\` value fails.
- **Writing a union where you meant a constrained TypeVar.** For \`def double(x: str | bytes) -> str | bytes: return x + x\`, mypy 2.3.1 reports \`Unsupported operand types for + ("str" and "bytes")\`, because it must assume one operand could be \`str\` and the other \`bytes\`. \`S = TypeVar("S", str, bytes)\` tells it both are the same one.
- **Reusing one module-level \`T\` and expecting it to mean the same type across functions.** Each function call binds its own \`T\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Without generics a function like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first(items)</code> must return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Any</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object</code>, so the link between the input type and the output type is lost.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. TypeVar:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T = TypeVar("T")</code> is a placeholder the type checker solves at each call: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def first(items: list[T]) -&gt; T</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> for a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list[int]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Generic classes:</strong> <span style="color:#f0e2c8;">A class inherits from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Generic[T]</code> (or uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Stack[T]:</code> on 3.12+), so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack[int]</code> is checked as a stack of ints. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> are generic the same way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Bounds and variance:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bound=float</code> allows subtypes and keeps the exact one; constraints allow exactly one of a list. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> is <strong style="color:#ffca28;">invariant</strong> because it is writable; read-only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sequence</code> is <strong style="color:#ffca28;">covariant</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Runtime:</strong> <span style="color:#f0e2c8;">It is all static: types are <strong style="color:#ffca28;">erased</strong>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack[int]()</code> is a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Stack</code>, nothing is checked, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(x, Stack[int])</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Any</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Any</code> switches checking off: the caller of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">first_any([3, 1])</code> gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Any</code> and can do anything with it. A TypeVar keeps the relationship, so the result is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> and misuse is caught.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TypeVar("T", bound=float)</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TypeVar("T", int, float)</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The bound accepts any subtype of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code> and binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> to the exact type passed. The constrained form accepts only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code>, and binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> to one of exactly those, so a subclass is treated as its listed parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can I not pass a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list[int]</code> to a function taking <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">list[float]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code> is invariant. The function could <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">append(0.5)</code> and the caller would then hold a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list[int]</code> containing a float. Take <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sequence[float]</code> if you only read, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Sequence</code> is covariant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you check <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">isinstance(x, list[int])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No, it raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. Type arguments are erased; the object is just a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>. To check contents at runtime you iterate yourself or use a validation library.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different in Python 3.12?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">3.12 adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def first[T](items: list[T]) -&gt; T</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Stack[T]:</code>: no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeVar</code> import, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Generic</code> base, parameters scoped to the definition, and variance inferred. The checking rules are the same.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type variable | A placeholder type, \`T = TypeVar("T")\`, solved by the checker at each use |
| Generic class | A class parameterised by type variables via \`Generic[T]\`, used as \`Stack[int]\` |
| Bound | \`bound=X\`: the type variable may be any subtype of \`X\` |
| Constrained type variable | \`TypeVar("S", str, bytes)\`: exactly one of the listed types |
| Variance | How subtyping of \`T\` carries over to \`G[T]\`: invariant, covariant or contravariant |
| Covariant type variable | \`covariant=True\`: a parameter that only comes out of the class |
| Type erasure | Type arguments are not kept on objects at runtime |

**Conclusion:** Generics let one function or class work for many types while keeping the types connected. A \`TypeVar\` is a placeholder the checker solves at every call, so \`first(list[int])\` returns \`int\` where \`Any\` would return an unchecked \`Any\`; a generic class inherits from \`Generic[T]\` so \`Stack[int]\` rejects a pushed \`str\`. Bounds (\`bound=float\`) and constraints (\`str, bytes\`) narrow what the placeholder may be, and variance explains why a mutable \`list[int]\` cannot stand in for a \`list[float]\` while a read-only \`Sequence\` can. All of it lives in the checker: at runtime the type argument is erased, \`Stack[int]()\` is a plain \`Stack\`, and \`isinstance\` refuses subscripted generics.`,
    examples: [
      {
        label: `A generic function and a generic Stack, and what survives at runtime`,
        code: `from typing import Generic, TypeVar, get_args, get_origin

T = TypeVar("T")

# 1. A generic function: the output type follows the input type.
def first(items: list[T]) -> T:
    return items[0]

print(first([3, 1, 2]), first(["b", "a"]))  # 3 b

# 2. A generic class: Stack[int], Stack[str] ... from one definition.
class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

ints = Stack[int]()
ints.push(1)
ints.push(2)
print(ints.pop())

# 3. What exists at runtime.
print(T, T.__name__)  # ~T T
print(Stack.__parameters__)  # (~T,)
alias = Stack[int]
print(alias, get_origin(alias), get_args(alias))
print(type(ints).__name__)  # Stack
print(ints.__orig_class__)
print(Stack[int] == Stack[int], Stack[int] == Stack[str])  # True False

# 4. Type erasure: the parameter is not checked, and not testable.
ints.push("not an int")
print(ints.pop())
try:
    isinstance(ints, Stack[int])
except TypeError as err:
    print("TypeError:", err)
print(isinstance(ints, Stack))  # True`,
      },
      {
        label: `Bound, constrained and covariant TypeVars, and why list is invariant`,
        code: `from typing import Sequence, TypeVar

# 1. Three flavours of TypeVar, and what each one records.
T = TypeVar("T")
N = TypeVar("N", bound=float)
S = TypeVar("S", str, bytes)
T_co = TypeVar("T_co", covariant=True)

for tv in (T, N, S, T_co):
    print(tv, tv.__bound__, tv.__constraints__, tv.__covariant__)

# 2. bound=float: any subtype of float (int counts) and the
#    result keeps the caller type.
def biggest(a: N, b: N) -> N:
    return a if a >= b else b

print(biggest(3, 7), biggest(2.5, 1.0))  # 7 2.5

# 3. Constrained: exactly str or exactly bytes, never mixed.
def double(x: S) -> S:
    return x + x

print(double("ab"), double(b"ab"))  # abab b'abab'

# 4. Why list[int] is not a list[float]: a write through the
#    wider name breaks the narrower one. Python does not stop it;
#    a type checker does.
def add_half(numbers: list[float]) -> None:
    numbers.append(0.5)

counts: list[int] = [1, 2]
add_half(counts)
print(counts)  # [1, 2, 0.5]
print(sum(counts))  # 3.5

# 5. Sequence is read-only, so it can be covariant.
def total(numbers: Sequence[float]) -> float:
    return sum(numbers)

print(total([1, 2]))  # 3`,
      },
    ],
  },
  {
    title: `What does typing.Self do and why does it beat TypeVar for methods?`,
    difficulty: "medium",
    seoDescription: `typing.Self (Python 3.11) means the class of the current instance, so fluent methods and classmethods keep subclass types without a bound TypeVar.`,
    description: `**Question presented to candidate:**
"I have a \`Shape\` class with chainable setters like \`set_scale()\` that return \`self\`, and a \`Circle\` subclass. If I annotate the setters \`-> Shape\`, chaining into a \`Circle\`-only method fails type checking. How does \`typing.Self\` fix that, and what did people do before it existed?"

**What a strong answer should cover:**
- \`Self\` (PEP 673, Python 3.11, \`typing_extensions\` for older versions) means **the type of the instance the method is called on**, so \`Circle().set_scale(2)\` is a \`Circle\`
- Annotating \`-> "Shape"\` loses the subclass; the pre-3.11 fix was a **TypeVar bound to the class** with \`self: T\` (and \`cls: type[T]\` for classmethods)
- \`Self\` is equivalent to that bound TypeVar but needs no extra TypeVar, no annotated \`self\`, and works on attributes (\`next: Self | None\`), classmethods, \`__enter__\` and Protocols
- Returning \`Self\` obliges you to return \`self\`, \`cls(...)\` or \`type(self)(...)\`: \`return Shape()\` is a type error, and runtime confirms it would give the wrong class
- Limits: not allowed in static methods or module-level functions; \`Self\` in a **parameter** means "the same subclass", which is stricter than the base class

**Code / implementation expected:** Optional — a small fluent builder or alternative constructor, showing the \`-> Self\` annotation and the subclass coming back.`,
    answer: `**Target Audience:** Python developers who write class hierarchies with chainable methods or alternative constructors and use a type checker.
**Difficulty:** Medium
**Python version:** \`typing.Self\` exists from Python 3.11. Runtime behaviour checked on CPython 3.11.17 and in the page runner (Pyodide 0.25.1, CPython 3.11.3). Type-checker output is from mypy 2.3.1 with \`--python-version 3.11\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A car factory has a generic "paint job" station. A sedan goes in, a painted sedan comes out; a pickup truck goes in, a painted pickup comes out. Now imagine the station stamped every car leaving it with the label "vehicle". The pickup is still a pickup, but the next station, "fit the truck bed", reads the label, sees "vehicle", and refuses it.

That is what happens when a method in a base class is annotated \`-> Shape\` and returns \`self\`. At runtime you really do get the \`Circle\` back, but the type checker only knows the label: "a \`Shape\`". Every subclass-specific method after it becomes an error.

\`typing.Self\` is the honest label: "whatever came in".

## 2. The Problem in Code

~~~python
class Shape:
    def set_scale(self, scale: float) -> "Shape":
        self.scale = scale
        return self

class Circle(Shape):
    def set_radius(self, radius: float) -> "Circle":
        self.radius = radius
        return self

Circle().set_scale(2.0).set_radius(3.0)
~~~

~~~text
self_problem.py:11: error: "Shape" has no attribute "set_radius"  [attr-defined]
Found 1 error in 1 file (checked 1 source file)
~~~

The runtime object returned by \`set_scale\` is a \`Circle\`, so the call works if you run it. But the annotation says \`Shape\`, and a \`Shape\` has no \`set_radius\`. The same thing happens to every alternative constructor written as \`@classmethod def unit(cls) -> "Shape"\`.

## 3. The Fix: \`Self\`

📌 **Interview term: \`Self\` type** — \`typing.Self\` stands for "the class of the object this method was called on". Formally it is a type variable bound to the enclosing class, which the checker fills in at each call ([PEP 673](https://peps.python.org/pep-0673/), accepted for Python 3.11; the \`typing_extensions\` package backports it to older versions).

~~~python
from typing import Self

class Shape:
    def set_scale(self, scale: float) -> Self:
        self.scale = scale
        return self

    @classmethod
    def unit(cls) -> Self:
        return cls()
~~~

On \`Circle().set_scale(2.0)\` the checker binds \`Self\` to \`Circle\`; on \`Circle.unit()\` it binds it through \`cls\`. Example 1 runs a fluent chain \`Circle().set_scale(2.0).set_color("red").set_radius(3.0)\` and \`Circle.unit()\`, and both come back as \`Circle\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 780 290" role="img" aria-label="Annotated as Shape, the result of Circle set_scale is seen as Shape and set_radius fails. Annotated as Self, the result is seen as Circle and set_radius is accepted">
  <defs>
    <marker id="py23q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="110" width="180" height="70" rx="10"/>
  <text class="d-text" x="110" y="141" text-anchor="middle">Circle()</text>
  <text class="d-sub" x="110" y="163" text-anchor="middle">.set_scale(2.0)</text>
  <rect class="d-box" x="290" y="25" width="210" height="70" rx="10"/>
  <text class="d-text" x="395" y="56" text-anchor="middle">-> Shape</text>
  <text class="d-sub" x="395" y="78" text-anchor="middle">checker sees Shape</text>
  <rect class="d-box-muted" x="570" y="25" width="190" height="70" rx="10"/>
  <text class="d-text" x="665" y="56" text-anchor="middle">.set_radius</text>
  <text class="d-sub" x="665" y="78" text-anchor="middle">error</text>
  <rect class="d-box-accent" x="290" y="195" width="210" height="70" rx="10"/>
  <text class="d-text" x="395" y="226" text-anchor="middle">-> Self</text>
  <text class="d-sub" x="395" y="248" text-anchor="middle">checker sees Circle</text>
  <rect class="d-box-accent" x="570" y="195" width="190" height="70" rx="10"/>
  <text class="d-text" x="665" y="226" text-anchor="middle">.set_radius</text>
  <text class="d-sub" x="665" y="248" text-anchor="middle">accepted</text>
  <path class="d-edge" d="M 200 130 L 284 70" marker-end="url(#py23q3-arrow)"/>
  <path class="d-edge-accent" d="M 200 160 L 284 220" marker-end="url(#py23q3-arrow)"/>
  <path class="d-edge-dashed" d="M 500 60 L 564 60" marker-end="url(#py23q3-arrow)"/>
  <path class="d-edge-accent" d="M 500 230 L 564 230" marker-end="url(#py23q3-arrow)"/>
</svg>

Same object at runtime in both rows; the only difference is what the checker is told it is.

## 4. Before 3.11: the Bound TypeVar Pattern

📌 **Interview term: self-type via bound TypeVar** — the PEP 484 way: declare a TypeVar bound to the class, annotate \`self\` (or \`cls\`) with it, and return it. The checker binds the TypeVar to the receiver's class.

~~~python
TShape = TypeVar("TShape", bound="Shape")

class Shape:
    def set_scale(self: TShape, scale: float) -> TShape: ...

    @classmethod
    def unit(cls: type[TShape]) -> TShape: ...
~~~

It works, and PEP 673 says \`Self\` behaves the same as this approach while being more concise. Here mypy treats both spellings identically, and it also catches the classic body bug: returning a hard-coded \`Shape()\` from a method that promises \`Self\`.

~~~python
from typing import Self, TypeVar

TShape = TypeVar("TShape", bound="OldShape")

class OldShape:
    def set_scale(self: TShape, scale: float) -> TShape:
        self.scale = scale
        return self

class Shape:
    def set_scale(self, scale: float) -> Self:
        self.scale = scale
        return self

    @classmethod
    def unit(cls) -> Self:
        return cls()

    def clone_wrong(self) -> Self:
        return Shape()

class Circle(Shape):
    pass

class OldCircle(OldShape):
    pass

reveal_type(Circle().set_scale(2.0))
reveal_type(OldCircle().set_scale(2.0))
reveal_type(Circle.unit())
~~~

~~~text
self_fixed.py:20: error: Incompatible return value type (got "Shape", expected "Self")  [return-value]
self_fixed.py:28: note: Revealed type is "self_fixed.Circle"
self_fixed.py:29: note: Revealed type is "self_fixed.OldCircle"
self_fixed.py:30: note: Revealed type is "self_fixed.Circle"
Found 1 error in 1 file (checked 1 source file)
~~~

Line 20 is the important one: with \`-> Self\`, \`return Shape()\` is rejected, because a subclass call would get a plain \`Shape\`. Example 2 shows that exact bug at runtime: \`Euro(150).doubled_wrong()\` returned a \`Money\`, while \`doubled()\` written as \`type(self)(...)\` returned a \`Euro\` with \`300\` cents.

## 5. Why \`Self\` Wins

| | \`-> "Shape"\` | Bound TypeVar | \`-> Self\` |
| :--- | :--- | :--- | :--- |
| Subclass keeps its type | no | yes | yes |
| Extra declaration | none | a module-level \`TypeVar\` per class | none |
| \`self\` / \`cls\` annotation | none | \`self: T\`, \`cls: type[T]\` | none |
| Works on attributes (\`next: Self \\| None\`) | n/a | no: mypy reports \`Type variable "TN" is unbound\` for \`next: TN \\| None\` in the class body | yes |
| Readable error messages | yes | mentions \`TShape\` | mentions \`Self\` |
| Python version | any | any | 3.11+, or \`typing_extensions\` |

The three practical wins: **less ceremony** (no TypeVar to name, bind and keep in sync), **fewer mistakes** (forgetting to annotate \`self: T\` on one method silently breaks it), and **more places it works** (class attributes, Protocols, nested types like \`list[Self]\`).

## 6. Where \`Self\` Is and Is Not Allowed

Allowed:

- return types and parameters of instance methods and classmethods
- attribute annotations in the class body: \`next: Self | None\` for linked structures, \`children: list[Self]\` for trees
- \`__enter__\` returning \`Self\`, so \`with Subclass() as x\` gives a \`Subclass\` (Example 2)
- methods in a \`Protocol\` (see [ABCs and Protocols](/interview-question/what-are-abstract-base-classes-and-protocols))

Not allowed, as mypy reports:

~~~python
from typing import Self

def helper(x: Self) -> Self:
    return x

class Config:
    @staticmethod
    def default() -> Self:
        raise NotImplementedError
~~~

~~~text
self_misuse.py:3: error: Self type is only allowed in annotations within class definition  [misc]
self_misuse.py:8: error: Static methods cannot use Self type  [misc]
self_misuse.py:8: error: A function returning TypeVar should receive at least one argument containing the same TypeVar  [type-var]
self_misuse.py:8: note: Consider using the upper bound "Config" instead
Found 3 errors in 1 file (checked 1 source file)
~~~

mypy also rejects it inside a metaclass (\`Self type cannot be used in a metaclass\`, from a separate check). A static method has no receiver, so there is nothing for \`Self\` to mean.

### The parameter trap

📌 **Interview term: \`Self\` in parameter position** — \`def same_kind(self, other: Self)\` means \`other\` must be the *same class as the receiver*, not any \`Shape\`. mypy accepted \`Shape().same_kind(Circle())\` but rejected the reverse:

~~~text
self_param.py:11: error: Argument 1 to "same_kind" of "Shape" has incompatible type "Shape"; expected "Circle"  [arg-type]
Found 1 error in 1 file (checked 1 source file)
~~~

That is right for \`__eq__\`-like helpers that only make sense within one class, and wrong for a general API that should accept any \`Shape\`. Annotate \`other: "Shape"\` when that is what you mean.

## 7. What \`Self\` Is at Runtime

Like every hint, \`Self\` changes nothing when the code runs. Example 1 shows it is a special form whose repr is \`typing.Self\`, that it sits unchanged in \`__annotations__\` (\`'return': typing.Self\`), that \`get_type_hints\` does not replace it with a class, and that \`isinstance(c, Self)\` raises \`TypeError: typing.Self cannot be used with isinstance()\`. All the "returns a \`Circle\`" behaviour comes from your code returning \`self\`, \`cls()\` or \`type(self)(...)\`.

## 8. Verified: Running the Code

Both examples were run on python3.11 and in the page runner (Pyodide 0.25.1). Example 1, *fluent setters and a classmethod constructor*, printed:

~~~text
Circle 2.0 red 3.0
Circle
typing.Self
{'scale': <class 'float'>, 'return': typing.Self}
{'radius': <class 'float'>, 'return': typing.Self}
TypeError: typing.Self cannot be used with isinstance()
~~~

Example 2, *the hard-coded-class bug, the TypeVar spelling, attributes and \`__enter__\`*, printed:

~~~text
Money
Euro 300
OldEuro
[1, 2, 3]
enter 9
Node
exit 9
{'value': 'int', 'next': 'Self | None', 'return': 'None'}
~~~

Example 2 uses \`from __future__ import annotations\`, which is why its last line shows the annotations as strings. The mypy output in sections 2, 4 and 6 came from running mypy 2.3.1 on the files shown.

## Edge Cases Worth Knowing

- **Generic classes.** In \`class Box(Generic[T])\`, \`Self\` keeps the type argument: mypy revealed \`Box[int]().copy()\` as \`Box[int]\`.
- **Older Pythons.** \`from typing_extensions import Self\` gives the same name on 3.10 and earlier; type checkers treat it identically.
- **Overriding a \`Self\` method.** mypy 2.3.1 accepts an override in \`Circle\` annotated \`-> "Circle"\`, but then a further subclass of \`Circle\` gets a \`Circle\` back from that method. Keep \`-> Self\` in overrides.
- **\`copy\`-style methods.** \`return type(self)(...)\` only works if every subclass constructor accepts the same arguments. If a subclass adds a required \`__init__\` parameter, the call fails at runtime even though it type-checks.

## Common Pitfalls

- **Returning the base class by name.** \`return Shape(...)\` in a \`-> Self\` method is a type error and, at runtime, the wrong class; use \`type(self)(...)\` or \`cls(...)\`.
- **Using \`Self\` in a \`@staticmethod\`.** There is no receiver to bind; make it a classmethod.
- **Annotating parameters as \`Self\` by reflex.** It forbids passing a parent-class object; only do it when "same subclass" is really required.
- **Keeping both spellings.** Mixing a bound TypeVar on some methods and \`Self\` on others in one class is legal but confusing; on 3.11+ migrate to \`Self\`.
- **Expecting runtime effects.** \`Self\` is not resolved to a class anywhere; \`get_type_hints\` hands back \`typing.Self\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">A base-class method annotated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt; "Shape"</code> that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> makes the checker see a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Shape</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle().set_scale(2).set_radius(3)</code> is an error even though it runs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Self:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.Self</code>, added in 3.11 by PEP 673, means <strong style="color:#ffca28;">the class of the receiver</strong>: on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle</code> it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle</code>, on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle.unit()</code> it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The old way:</strong> <span style="color:#f0e2c8;">Before 3.11 you declared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T = TypeVar("T", bound="Shape")</code> and wrote <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def set_scale(self: T) -&gt; T</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls: type[T]</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Self</code> means the same thing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Why it wins:</strong> <span style="color:#f0e2c8;">No extra TypeVar, no annotating <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>, nothing to forget per method, and it works for attributes like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">next: Self | None</code> and in Protocols.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Return <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(self)()</code>, never a hard-coded class; not allowed in static methods or functions; as a <strong style="color:#ffca28;">parameter</strong> it means same subclass. It is checker-only.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Self</code> change anything at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is a marker: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Shape.set_scale.__annotations__</code> holds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.Self</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance(x, Self)</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>. The subclass comes back because the method returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls()</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">return Shape()</code> an error in a method returning <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Self</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because when called on a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle</code> the method promises a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Shape()</code> is not one. mypy reports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Incompatible return value type (got "Shape", expected "Self")</code>; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type(self)(...)</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Self</code> in a static method?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. mypy says <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Static methods cannot use Self type</code>. A static method has no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cls</code>, so there is no class to bind. Make it a classmethod.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">def same_kind(self, other: Self)</code> mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">other</code> must be the same class as the receiver. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Circle().same_kind(Shape())</code> is rejected. Use the base class name if any <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Shape</code> should be accepted.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do I use it on Python 3.10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from typing_extensions import Self</code>. Type checkers treat it exactly like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.Self</code>; at runtime it is just another marker.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`Self\` type | \`typing.Self\`: the class of the receiver of the method, bound by the checker at each call |
| Self-type via bound TypeVar | The pre-3.11 pattern \`T = TypeVar("T", bound="C")\` with \`self: T\` / \`cls: type[T]\` |
| \`Self\` in parameter position | \`other: Self\` requires the same class as the receiver, not any base-class instance |

**Conclusion:** \`typing.Self\`, added in Python 3.11 by PEP 673, annotates "the class of the instance (or \`cls\`) this method was called on". It fixes the classic problem where a base-class method annotated \`-> "Shape"\` makes \`Circle().set_scale(2).set_radius(3)\` fail type checking, and it replaces the old pattern of a TypeVar bound to the class with \`self: T\` and \`cls: type[T]\`. The two mean the same thing to a checker, but \`Self\` needs no extra declaration, cannot be forgotten on one method, works on attributes such as \`next: Self | None\`, and makes the checker reject a hard-coded \`return Shape()\`. It is not allowed in static methods or plain functions, it is stricter than the base class when used for a parameter, and like every hint it does nothing at runtime: returning \`self\`, \`cls()\` or \`type(self)(...)\` is what actually produces the subclass.`,
    examples: [
      {
        label: `Fluent setters and a classmethod constructor that keep the subclass`,
        code: `from typing import Self, get_type_hints

class Shape:
    def __init__(self) -> None:
        self.scale = 1.0
        self.color = "black"

    # Fluent setters return the same object, so calls chain.
    def set_scale(self, scale: float) -> Self:
        self.scale = scale
        return self

    def set_color(self, color: str) -> Self:
        self.color = color
        return self

    # An alternative constructor: build an instance of cls,
    # which is the subclass when called on one.
    @classmethod
    def unit(cls) -> Self:
        return cls().set_scale(1.0)

class Circle(Shape):
    def set_radius(self, radius: float) -> Self:
        self.radius = radius
        return self

c = Circle().set_scale(2.0).set_color("red").set_radius(3.0)
print(type(c).__name__, c.scale, c.color, c.radius)  # Circle 2.0 red 3.0
print(type(Circle.unit()).__name__)  # Circle

# What Self is at runtime: a marker, never replaced by a class.
print(Self)  # typing.Self
print(Shape.set_scale.__annotations__)
print(get_type_hints(Circle.set_radius))

# Self cannot be called or checked with isinstance.
try:
    isinstance(c, Self)
except TypeError as err:
    print("TypeError:", err)`,
      },
      {
        label: `The hard-coded-class bug, the old TypeVar spelling, Self in attributes and __enter__`,
        code: `from __future__ import annotations
from typing import Self, TypeVar

# 1. The bug Self prevents: a hard-coded class name.
class Money:
    def __init__(self, cents: int) -> None:
        self.cents = cents

    def doubled_wrong(self) -> Money:
        return Money(self.cents * 2)

    def doubled(self) -> Self:
        return type(self)(self.cents * 2)

class Euro(Money):
    symbol = "EUR"

e = Euro(150)
print(type(e.doubled_wrong()).__name__)  # Money
print(type(e.doubled()).__name__, e.doubled().cents)  # Euro 300

# 2. The pre-3.11 spelling: a TypeVar bound to the class.
TMoney = TypeVar("TMoney", bound="OldMoney")

class OldMoney:
    def __init__(self, cents: int) -> None:
        self.cents = cents

    def doubled(self: TMoney) -> TMoney:
        return type(self)(self.cents * 2)

class OldEuro(OldMoney):
    pass

print(type(OldEuro(1).doubled()).__name__)  # OldEuro

# 3. Self in attributes and in __enter__.
class Node:
    def __init__(self, value: int, next: Self | None = None) -> None:
        self.value = value
        self.next = next

    def __enter__(self) -> Self:
        print("enter", self.value)
        return self

    def __exit__(self, *exc: object) -> None:
        print("exit", self.value)

chain = Node(1, Node(2, Node(3)))
values = []
node = chain
while node is not None:
    values.append(node.value)
    node = node.next
print(values)  # [1, 2, 3]

with Node(9) as n:
    print(type(n).__name__)

# With the future import, hints are strings until asked for.
print(Node.__init__.__annotations__)`,
      },
    ],
  },
  {
    title: `What is Python 3.12's new type parameter syntax (type, generic classes)?`,
    difficulty: "medium",
    seoDescription: `PEP 695 in Python 3.12: class Box[T], def f[T], the type statement, scoped and lazily evaluated parameters, inferred variance, and 3.13 defaults.`,
    description: `**Question presented to candidate:**
"Python 3.12 lets you write \`class Box[T]:\` and \`type Pair[T] = tuple[T, T]\`. What does that replace, what actually changes at runtime, and why is it more than just shorter syntax?"

**What a strong answer should cover:**
- PEP 695 (Python 3.12) adds **type parameter lists**: \`def first[T](xs: list[T]) -> T\`, \`class Box[T]:\`, with no \`TypeVar\` import and no \`Generic[T]\` base (the class still gets \`Generic\` in its MRO)
- Bounds and constraints are written inline: \`[N: float]\`, \`[S: (str, bytes)]\`; **variance is inferred** by the checker instead of declared with \`covariant=True\`
- The \`type\` statement creates a \`TypeAliasType\` whose value is **evaluated lazily**, so recursive and forward-referencing aliases need no quotes; \`type\` is a soft keyword
- Parameters live in their own **annotation scope**: they do not leak into the module, and bounds are evaluated only when accessed (\`__type_params__\`, \`__bound__\`, \`__value__\`)
- Python 3.13 adds **defaults** (\`class Response[Body = str]\`, PEP 696); the old and new styles cannot be mixed in one class, and an alias is not a class (\`isinstance\` rejects it)

**Code / implementation expected:** Optional — rewrite an old \`TypeVar\` / \`Generic\` class and a \`TypeAlias\` in the new syntax, and say which Python version each needs.`,
    answer: `**Target Audience:** Python developers who know \`TypeVar\` and \`Generic\` and are moving a codebase to Python 3.12 or later.
**Difficulty:** Medium
**Python version:** The syntax needs **Python 3.12+** (defaults need 3.13+). Examples 2 and 3 were run on CPython 3.12.3 and 3.13.16 and are shown as code here, because the page runner is Pyodide 0.25.1 (CPython 3.11.3), where the syntax is a \`SyntaxError\`. Example 1 runs in the page. Type-checker output is from mypy 2.3.1.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Before 3.12, writing a generic class was like filling in a form at a government office: first go to counter A and register a placeholder (\`T = TypeVar("T")\`), then take the ticket to counter B and declare that your class uses it (\`class Box(Generic[T])\`), and if your placeholder should only ever go out and never come in, tick a box marked \`covariant=True\` on yet another form. Forget any step and nobody tells you until the type checker does.

Python 3.12 moved all of that onto one line, right where you declare the class: \`class Box[T]:\`. The placeholder is born there, belongs only to that class, and the checker works out the covariance box for you.

The same release added a proper statement for type aliases, \`type Pair[T] = tuple[T, T]\`, which solves an old annoyance: aliases that refer to themselves or to things defined later.

## 2. The Old Way, and What Was Wrong With It

This is the 3.11 code the new syntax replaces. Example 1 runs it in the page.

~~~python
from typing import Generic, TypeAlias, TypeVar

T = TypeVar("T")

class Box(Generic[T]):
    def __init__(self, item: T) -> None:
        self.item = item

def first(items: list[T]) -> T:
    return items[0]

Pair: TypeAlias = tuple[T, T]
~~~

The problems the run shows:

- **The placeholder leaks.** \`T\` is an ordinary module global (\`"T" in globals()\` printed \`True\`). Every function in the module can reuse it, and readers have to scroll up to find what \`T\` is.
- **The name is written twice.** \`TypeVar("T")\` must match the variable name; checkers reject a mismatch.
- **Aliases are evaluated immediately.** \`Pair\` is just a variable holding a \`GenericAlias\`. A recursive alias needs quoted names (\`dict[str, 'Json']\`), and an alias to a class defined later fails at once with \`NameError: name 'NotYetDefined' is not defined\`.
- **Variance is manual.** You must create separate \`T_co = TypeVar("T_co", covariant=True)\` objects and use them in the right places.

## 3. The New Syntax

📌 **Interview term: type parameter list** — square brackets right after the name in a \`def\`, \`class\` or \`type\` statement, declaring the type parameters of that definition ([PEP 695](https://peps.python.org/pep-0695/), Python 3.12).

~~~python
class Box[T]:
    def __init__(self, item: T) -> None:
        self.item = item

def first[T](items: list[T]) -> T:
    return items[0]

def biggest[N: float](a: N, b: N) -> N:          # bound
    return a if a >= b else b

def double[S: (str, bytes)](x: S) -> S:          # constraints
    return x + x

type Pair[T] = tuple[T, T]                       # generic alias
type Json = dict[str, Json] | list[Json] | str | int | float | bool | None
~~~

| Old spelling (3.11 and earlier) | New spelling (3.12+) |
| :--- | :--- |
| \`T = TypeVar("T")\` + \`class Box(Generic[T])\` | \`class Box[T]:\` |
| \`def first(items: list[T]) -> T\` with a global \`T\` | \`def first[T](items: list[T]) -> T\` |
| \`N = TypeVar("N", bound=float)\` | \`[N: float]\` |
| \`S = TypeVar("S", str, bytes)\` | \`[S: (str, bytes)]\` |
| \`T_co = TypeVar("T_co", covariant=True)\` | nothing: variance is inferred |
| \`Ts = TypeVarTuple("Ts")\`, \`P = ParamSpec("P")\` | \`[*Ts]\`, \`[**P]\` |
| \`Pair: TypeAlias = tuple[T, T]\` | \`type Pair[T] = tuple[T, T]\` |
| \`T = TypeVar("T", default=str)\` (3.13) | \`[T = str]\` (3.13) |

The new form creates the same kinds of objects. Example 2 shows \`Box.__type_params__\` is \`(T,)\` and holds a real \`TypeVar\`, and the class still has \`typing.Generic\` in its MRO (\`(<class '__main__.Box'>, <class 'typing.Generic'>, <class 'object'>)\`): the compiler adds the base for you.

## 4. What Really Changes: Scope and Laziness

### Annotation scopes

📌 **Interview term: annotation scope** — a new kind of scope introduced in 3.12 for type parameters and alias values. It behaves like a function scope, but it can also see names in an enclosing class body. Type parameters live there, so after \`class Box[T]\` the name \`T\` is not a module global: Example 2 printed \`False\` for \`"T" in globals()\`.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 280" role="img" aria-label="Old style: T is a module global visible to every function. New style: T lives in an annotation scope wrapped around one class">
  <rect class="d-box-muted" x="20" y="30" width="330" height="220" rx="12"/>
  <text class="d-text" x="185" y="62" text-anchor="middle">module scope</text>
  <rect class="d-box" x="60" y="95" width="250" height="44" rx="8"/>
  <text class="d-text" x="185" y="123" text-anchor="middle">T = TypeVar("T")</text>
  <rect class="d-box" x="60" y="180" width="250" height="44" rx="8"/>
  <text class="d-sub" x="185" y="208" text-anchor="middle">every def and class can use T</text>
  <rect class="d-box-muted" x="410" y="30" width="330" height="220" rx="12"/>
  <text class="d-text" x="575" y="62" text-anchor="middle">module scope</text>
  <rect class="d-box-accent" x="440" y="85" width="270" height="145" rx="10"/>
  <text class="d-text" x="575" y="115" text-anchor="middle">annotation scope: T</text>
  <rect class="d-box" x="470" y="160" width="210" height="44" rx="8"/>
  <text class="d-text" x="575" y="188" text-anchor="middle">class Box[T]</text>
</svg>

On the left, \`T\` is one shared global; on the right, \`T\` exists only inside the scope wrapped around \`Box\`, and a second \`class Other[T]\` gets its own, unrelated \`T\`.

### Lazy evaluation

📌 **Interview term: lazy evaluation (of aliases and bounds)** — the value of a \`type\` alias, and the bound or constraints of a type parameter, are not computed when the statement runs. They are computed the first time someone reads \`__value__\`, \`__bound__\` or \`__constraints__\`.

Example 2 defines \`type Later = list[NotYetDefined]\` *before* the class exists. Reading \`Later.__value__\` then raised \`NameError\`, and after \`class NotYetDefined\` was defined the same read returned \`list[__main__.NotYetDefined]\`. That is why \`type Json = dict[str, Json] | ...\` needs no quotes. Bounds behave the same: in a separate 3.12 check, \`def f[T: Undefined](x: T)\` was defined without error and only \`f.__type_params__[0].__bound__\` raised \`NameError: name 'Undefined' is not defined\`.

### The \`type\` statement makes a real alias object

📌 **Interview term: \`TypeAliasType\`** — the runtime class of an alias created by \`type X = ...\`. It has \`__name__\`, \`__type_params__\` and the lazy \`__value__\`; subscripting it (\`Pair[int]\`) gives a generic alias whose \`get_args\` is \`(int,)\`. Unlike the old style, the alias is **not** the same object as its value: in our 3.12 check, \`type X = int\` gave \`X == int\` as \`False\` and \`X.__value__ == int\` as \`True\`. For the same reason \`isinstance([], Json)\` raises \`TypeError\`. The functional form \`TypeAliasType("Pair", tuple[T, T], type_params=(T,))\` also exists in \`typing\` on 3.12 and printed \`P[int]\` in our check.

The \`typing\` docs mark \`TypeAlias\` as deprecated since 3.12 in favour of the \`type\` statement, with no removal planned ([typing.TypeAlias docs](https://docs.python.org/3/library/typing.html#typing.TypeAlias)).

📌 **Interview term: soft keyword** — \`type\` is a keyword only at the start of a \`type X = ...\` statement. Everywhere else it is still the builtin, and you can even assign to it: the last line of Example 2 does \`type = "still a name"\`.

## 5. Variance Is Inferred

📌 **Interview term: variance inference** — for type parameters declared with the new syntax, the checker decides from how the class *uses* \`T\` whether it is covariant, contravariant or invariant. At runtime the parameter records only that it should be inferred: Example 2 printed \`True False\` for \`__infer_variance__\` and \`__covariant__\`.

~~~python
class ReadOnlyBox[T]:
    def __init__(self, item: T) -> None:
        self._item = item
    def get(self) -> T:
        return self._item

class MutableBox[T]:
    def __init__(self, item: T) -> None:
        self.item = item
    def set(self, item: T) -> None:
        self.item = item

type Pair[T] = tuple[T, T]

def biggest[N: float](a: N, b: N) -> N:
    return a if a >= b else b

ro_int: ReadOnlyBox[int] = ReadOnlyBox(1)
ro_float: ReadOnlyBox[float] = ro_int
mut_int: MutableBox[int] = MutableBox(1)
mut_float: MutableBox[float] = mut_int
p: Pair[str] = ("a", 1)
reveal_type(biggest(2, 3))
~~~

~~~text
pep695_demo.py:21: error: Incompatible types in assignment (expression has type "MutableBox[int]", variable has type "MutableBox[float]")  [assignment]
pep695_demo.py:22: error: Incompatible types in assignment (expression has type "tuple[str, int]", variable has type "tuple[str, str]")  [assignment]
pep695_demo.py:23: note: Revealed type is "int"
Found 2 errors in 1 file (checked 1 source file)
~~~

\`ReadOnlyBox\` only returns \`T\`, so mypy inferred it covariant and accepted \`ReadOnlyBox[int]\` as a \`ReadOnlyBox[float]\` (line 19, no error). \`MutableBox\` accepts \`T\` in \`set\`, so it is invariant and line 21 is rejected, with no \`covariant=\` anywhere. Variance itself is explained in [generics and TypeVar](/interview-question/what-are-generics-and-typevar-in-python). Checked against an older target, the same file stops at line 1:

~~~text
pep695_demo.py:1: error: Type parameter lists are only supported in Python 3.12 and greater  [syntax]
Found 1 error in 1 file (errors prevented further checking)
~~~

## 6. Python 3.13: Defaults

📌 **Interview term: type parameter default** — \`class Response[Body = str]\` means "if nobody says what \`Body\` is, assume \`str\`". Added in Python 3.13 by PEP 696, for \`TypeVar\`, \`ParamSpec\` and \`TypeVarTuple\`, in both the new syntax and the old \`TypeVar(..., default=...)\` form ([PEP 696](https://peps.python.org/pep-0696/), [What is new in 3.13](https://docs.python.org/3.13/whatsnew/3.13.html)).

Example 3 shows \`__default__\`, \`has_default()\` and the \`typing.NoDefault\` sentinel for a parameter without a default, and two rules: a non-default parameter cannot follow a default one (\`SyntaxError: non-default type parameter 'B' follows default type parameter\`), and a class cannot use both styles (\`class Mixed[V](Generic[T])\` raises \`TypeError: Cannot inherit from Generic[...] multiple times.\`).

## 7. Verified: Running the Code

Example 1, the old spelling, was run on python3.11 and in the page runner (Pyodide 0.25.1):

~~~text
tuple[int, int]
GenericAlias
True ~T
(~T,) (<class 'typing.Generic'>, <class 'object'>)
dict[str, 'Json'] list['Json']
NameError: name 'NotYetDefined' is not defined
SyntaxError: invalid syntax
~~~

Example 2 (\`runnable: false\`, Python 3.12) was run on CPython 3.12.3; 3.13.16 printed the same:

~~~text
(T,) (T,)
(<class '__main__.Box'>, <class 'typing.Generic'>, <class 'object'>)
__main__.Box[int] 4
False
<class 'float'> (<class 'str'>, <class 'bytes'>)
True False
TypeAliasType Pair (T,)
Pair[int] (<class 'int'>,)
dict[str, Json] | list[Json] | str | int | float | bool | None
NameError on first use: name 'NotYetDefined' is not defined
list[__main__.NotYetDefined]
TypeError: isinstance() arg 2 must be a type, a tuple of types, or a union
still a name
~~~

Example 3 (\`runnable: false\`, Python 3.13) was run on CPython 3.13.16:

~~~text
<class 'str'> <class 'int'> <class 'int'>
True
False True
<class 'bytes'>
TypeError: Cannot inherit from Generic[...] multiple times.
SyntaxError: non-default type parameter 'B' follows default type parameter
~~~

The mypy output in section 5 came from mypy 2.3.1 with \`--python-version 3.12\` and then \`3.11\`.

## Edge Cases Worth Knowing

- **It is new syntax, not a library feature.** No \`__future__\` import or \`typing_extensions\` backport makes \`class Box[T]\` parse on 3.11; supporting older versions means keeping \`TypeVar\`.
- **Inside a class body,** an annotation scope can see class-level names: in our 3.12 check, \`def m[T: Inner](self, x: T)\` inside \`class C\` resolved the bound to \`C.Inner\`.
- **\`__type_params__\`** exists on classes, functions and aliases; it is how libraries discover the parameters at runtime.
- **A parameter list per definition.** A method in \`class Box[T]\` can add its own: \`def map[U](self, f: Callable[[T], U]) -> Box[U]\`.
- **A \`TypeAliasType\` cannot be subclassed or called** like the class it names; use the real class for that.

## Common Pitfalls

- **Mixing styles in one class.** \`class Box[T](Generic[U])\` fails at runtime; convert a class completely.
- **Expecting \`type X = int\` to make \`X\` *be* \`int\`.** It is a \`TypeAliasType\`; \`X == int\` is \`False\` and \`isinstance\` rejects it. Use the real class at runtime.
- **Relying on an eager error.** A typo in a bound or alias value is only reported when the value is read (or by the type checker), not when the module imports.
- **Declaring variance by habit.** Old \`T_co\` names do nothing in the new syntax; the checker infers it from usage, so make read-only classes genuinely read-only.
- **Shipping 3.12 syntax in a library that supports 3.11.** It is a \`SyntaxError\` at import time on older interpreters, as Example 1 shows.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">PEP 695 in Python 3.12 adds <strong style="color:#ffca28;">type parameter lists</strong>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def first[T](xs: list[T]) -&gt; T</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Box[T]:</code>. No <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeVar</code> import, no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Generic[T]</code> base.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Bounds and aliases:</strong> <span style="color:#f0e2c8;">Bounds and constraints go inline, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[N: float]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[S: (str, bytes)]</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type Pair[T] = tuple[T, T]</code> replaces <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeAlias</code>, creating a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeAliasType</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Scope:</strong> <span style="color:#f0e2c8;">Parameters live in an <strong style="color:#ffca28;">annotation scope</strong>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> does not leak into the module, and each definition gets its own.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Laziness and variance:</strong> <span style="color:#f0e2c8;">Alias values and bounds are <strong style="color:#ffca28;">evaluated lazily</strong>, so recursive aliases need no quotes, and the checker <strong style="color:#ffca28;">infers variance</strong> instead of you writing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">covariant=True</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Versions and rules:</strong> <span style="color:#f0e2c8;">It needs 3.12 to parse; 3.13 adds defaults like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[T = str]</code>. Do not mix the old and new styles in one class, and remember an alias is not a class.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">class Box[T]:</code> different at runtime from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">class Box(Generic[T])</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Barely. The compiler creates a real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeVar</code>, stores it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Box.__type_params__</code>, and still adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Generic</code> to the MRO. The difference is scoping: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">T</code> is not a module global.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do recursive aliases work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type</code> but not with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">TypeAlias</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeAlias</code> assignment is evaluated immediately, so the alias name does not exist yet. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> statement stores its value lazily in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__value__</code>, which is evaluated only when read.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you declare a covariant type parameter in the new syntax?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You do not. The checker infers variance from usage: a parameter that only appears in return types becomes covariant, one accepted by a method stays invariant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I use this syntax in a library that supports 3.10?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is new grammar, so older interpreters raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code> at import. Keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeVar</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Generic</code> until the minimum version is 3.12.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">type X = int</code> the same as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">X = int</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X</code> becomes a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeAliasType</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X == int</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X.__value__</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>, and you cannot call it or use it in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code>. Use it in annotations only.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type parameter list | The \`[T, ...]\` after a \`def\`, \`class\` or \`type\` name (PEP 695, 3.12) |
| Annotation scope | The scope holding type parameters and alias values; it can see enclosing class names |
| Lazy evaluation | Alias values and bounds computed on first access of \`__value__\` / \`__bound__\` |
| \`TypeAliasType\` | The runtime object created by a \`type\` statement |
| Soft keyword | A word that is a keyword only in one position, like \`type\` and \`match\` |
| Variance inference | The checker deciding covariance from how a class uses its parameter |
| Type parameter default | \`[T = str]\`: the type used when none is given (PEP 696, 3.13) |

**Conclusion:** PEP 695 gives Python 3.12 a native syntax for generics: \`def first[T]\`, \`class Box[T]\`, inline bounds \`[N: float]\` and constraints \`[S: (str, bytes)]\`, and the \`type\` statement for aliases. It is more than shorthand. Type parameters live in their own annotation scope instead of leaking as module globals, alias values and bounds are evaluated lazily so recursive and forward-referencing aliases just work, \`type\` aliases are real \`TypeAliasType\` objects rather than the value itself, and variance is inferred by the checker from how the class uses \`T\`. The compiler still produces ordinary \`TypeVar\`s and a \`Generic\` base, so existing tools understand it; Python 3.13 adds defaults with \`[T = str]\`, and the one rule to remember when migrating is that a class uses either the old style or the new one, never both.`,
    examples: [
      {
        label: `The pre-3.12 spelling it replaces, and its problems (runs in the page on 3.11)`,
        code: `# The pre-3.12 spelling that PEP 695 replaces (runs on 3.11).
from typing import Generic, TypeAlias, TypeVar, Union

# Every type parameter is a module-level object you create first.
T = TypeVar("T")
K = TypeVar("K", bound=str)

class Box(Generic[T]):
    def __init__(self, item: T) -> None:
        self.item = item

def first(items: list[T]) -> T:
    return items[0]

# An old-style alias is just a variable holding the value, evaluated now.
Pair: TypeAlias = tuple[T, T]
print(Pair[int])  # tuple[int, int]
print(type(Pair).__name__)  # GenericAlias

# T leaks: it is a global anyone can reuse (or misuse).
print("T" in globals(), T)  # True ~T
print(Box.__parameters__, Box.__mro__[1:])

# Eager evaluation: a recursive alias needs a quoted name.
Json = Union[dict[str, "Json"], list["Json"], str, int, float, bool, None]
print(Json.__args__[0], Json.__args__[1])

# And an alias to a class defined later fails at once.
try:
    Later: TypeAlias = list[NotYetDefined]
except NameError as err:
    print("NameError:", err)

# The page runs 3.11, where the new form is a SyntaxError.
try:
    compile("type Pair[T] = tuple[T, T]", "<new>", "exec")
except SyntaxError as err:
    print("SyntaxError:", err.msg)`,
      },
      {
        label: `PEP 695 on Python 3.12: generic classes and functions, bounds, the type statement`,
        code: `# Python 3.12+: PEP 695 type parameter syntax.
from typing import get_args

# 1. Generic class and function: no TypeVar, no Generic base.
class Box[T]:
    def __init__(self, item: T) -> None:
        self.item = item

    def get(self) -> T:
        return self.item

def first[T](items: list[T]) -> T:
    return items[0]

print(Box.__type_params__, first.__type_params__)
print(Box.__mro__)
print(Box[int], first([4, 5]))

# The parameter is scoped to its class or function.
print("T" in globals())

# 2. Bounds and constraints go after a colon.
def biggest[N: float](a: N, b: N) -> N:
    return a if a >= b else b

def double[S: (str, bytes)](x: S) -> S:
    return x + x

(n,) = biggest.__type_params__
(s,) = double.__type_params__
print(n.__bound__, s.__constraints__)

# 3. Variance is inferred by the checker, not declared.
print(n.__infer_variance__, n.__covariant__)

# 4. The type statement makes a lazy TypeAliasType.
type Pair[T] = tuple[T, T]
type Json = dict[str, Json] | list[Json] | str | int | float | bool | None
type Later = list[NotYetDefined]

print(type(Pair).__name__, Pair.__name__, Pair.__type_params__)
print(Pair[int], get_args(Pair[int]))
print(Json.__value__)
try:
    Later.__value__
except NameError as err:
    print("NameError on first use:", err)

class NotYetDefined: ...
print(Later.__value__)

# 5. An alias is not a class: no isinstance, no calling.
try:
    isinstance([], Json)
except TypeError as err:
    print("TypeError:", err)

# 6. type is a soft keyword: still fine as a variable name.
type = "still a name"
print(type)`,
        runnable: false,
        python: "3.12",
      },
      {
        label: `Python 3.13 type parameter defaults, and two rules of the new syntax`,
        code: `# Python 3.13+: type parameter defaults (PEP 696), plus two rules.
from typing import Generic, NoDefault, TypeVar

# 1. A default fills in a parameter the user leaves out.
class Response[Body = str, Status: int = int]:
    def __init__(self, body: Body, status: Status) -> None:
        self.body = body
        self.status = status

body, status = Response.__type_params__
print(body.__default__, status.__default__, status.__bound__)
print(body.has_default())

def plain[T](x: T) -> T:
    return x

(t,) = plain.__type_params__
print(t.has_default(), t.__default__ is NoDefault)

# The old-style TypeVar gained the same keyword.
U = TypeVar("U", default=bytes)
print(U.__default__)

# 2. Old and new styles do not mix on one class.
T = TypeVar("T")
try:
    class Mixed[V](Generic[T]):
        pass
except TypeError as err:
    print("TypeError:", err)

# 3. A parameter without a default after one with a default is an error.
try:
    compile("class Bad[A = int, B]: pass", "<bad>", "exec")
except SyntaxError as err:
    print("SyntaxError:", err.msg)`,
        runnable: false,
        python: "3.13",
      },
    ],
  },
  {
    title: `What is TypeVarTuple and Unpack for variadic generics?`,
    difficulty: "hard",
    seoDescription: `TypeVarTuple (PEP 646, Python 3.11) stands for any number of types in order. *Ts vs Unpack, array shapes, typed *args, Callable[[*Ts], R] and the limits.`,
    description: `**Question presented to candidate:**
"A normal \`TypeVar\` stands for one type. How would you type a function like \`call_soon(callback, *args)\` so the checker verifies that \`args\` match the callback's parameters, or an \`Array\` class whose type includes its shape, like \`Array[float, Height, Width]\`? What are \`TypeVarTuple\` and \`Unpack\`?"

**What a strong answer should cover:**
- \`TypeVarTuple\` (PEP 646, Python 3.11) is a placeholder for **any number of types, in order**; it is always used **unpacked**, as \`*Ts\` or the equivalent \`Unpack[Ts]\`
- **Variadic generic classes**: \`class Array(Generic[DType, *Shape])\` lets \`Array[float, Height, Width]\` carry a shape; the motivating use is array shapes in NumPy-style libraries
- **Typed \`*args\`**: \`def f(*args: *Ts) -> tuple[*Ts]\` keeps each argument type; \`Callable[[*Ts], R]\` with \`*args: *Ts\` ties a callback to its arguments (how typeshed types \`asyncio\` \`call_soon\`)
- Combining with \`TypeVar\` for prefix/suffix (\`tuple[T, *Ts]\`), and unpacking concrete tuple types (\`*tuple[int, ...]\`)
- Limits: only **one** TypeVarTuple per parameter list, \`*Ts\` only on \`*args\`, no keyword arguments (use \`ParamSpec\` for that), the runtime checks none of it; 3.12 syntax \`class Array[DType, *Shape]\`, 3.13 defaults

**Code / implementation expected:** Optional — a typed \`*args\` function or a callback scheduler using \`Callable[[*Ts], R]\`, with what the checker infers.`,
    answer: `**Target Audience:** Python developers comfortable with \`TypeVar\` and generics who meet \`*Ts\` in library stubs, or need to type functions that forward \`*args\`.
**Difficulty:** Hard
**Python version:** \`TypeVarTuple\`, \`Unpack\` and the \`*Ts\` star syntax are in \`typing\` from Python 3.11. Runtime behaviour checked on CPython 3.11.17, 3.12.3 and 3.13.16, and in the page runner (Pyodide 0.25.1, CPython 3.11.3). Type-checker output is from mypy 2.3.1 with \`--python-version 3.11\`.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All output shown was produced by actually running the code; the **Verified** section quotes it in full. It builds on [generics and TypeVar](/interview-question/what-are-generics-and-typevar-in-python); read that first if \`T = TypeVar("T")\` is new.

## 1. Why This Even Matters — A Story First

A delivery service lets you book a courier for "a parcel": one box in, the same box out. That is a \`TypeVar\`. Now you want a service for a whole *train* of boxes: maybe two, maybe five, each of a different kind, and the promise is that the boxes arrive **in the same order, each one unchanged**. A label that says "some boxes" is useless; you want the label to list every box: "a lamp, then a chair, then a rug".

\`TypeVarTuple\` is that list-shaped label. It stands for "however many types there are, in this order". The checker fills it in at each use: \`(int, str, float)\` for one call, \`(Height, Width)\` for one array.

Two real problems need it:

- **Forwarding arguments.** \`loop.call_soon(callback, *args)\` should be rejected if \`args\` do not fit \`callback\`. With a plain TypeVar you can describe one argument, not "whatever arguments this callback takes".
- **Array shapes.** Numerical code wants \`Array[float, Height, Width]\` so that passing a \`(Width, Height)\` image where a \`(Height, Width)\` one is expected is a type error. PEP 646 names shape typing in libraries like NumPy and TensorFlow as its main motivation ([PEP 646](https://peps.python.org/pep-0646/)).

## 2. The Core Idea

📌 **Interview term: TypeVarTuple** — a type variable that stands for a sequence of zero or more types, created with \`Ts = TypeVarTuple("Ts")\`. Accepted for Python 3.11 by PEP 646.

📌 **Interview term: variadic generic** — a generic class or function that takes a variable number of type parameters, by using a TypeVarTuple.

📌 **Interview term: unpacking (\`*Ts\` / \`Unpack[Ts]\`)** — a TypeVarTuple is never used bare. You write \`*Ts\` (or \`Unpack[Ts]\`, which means the same) to say "splice the types in here", exactly like \`*args\` splices values. \`tuple[*Ts]\` with \`Ts = (int, str)\` means \`tuple[int, str]\`. The CPython docs state that \`Unpack\` and \`*\` can be used interchangeably; \`Unpack[Ts]\` is the spelling for places the star is not allowed, and for older versions via \`typing_extensions\`.

~~~python
from typing import TypeVarTuple

Ts = TypeVarTuple("Ts")

def as_tuple(*args: *Ts) -> tuple[*Ts]:
    return args
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 780 270" role="img" aria-label="The call as_tuple with 1, a and 2.5 binds Ts to int, str, float, so the return type tuple of star Ts becomes tuple of int, str, float">
  <defs>
    <marker id="py23q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="131" text-anchor="middle">as_tuple(1, "a", 2.5)</text>
  <text class="d-sub" x="120" y="153" text-anchor="middle">*args: *Ts</text>
  <rect class="d-box" x="300" y="30" width="90" height="44" rx="8"/>
  <text class="d-text" x="345" y="58" text-anchor="middle">int</text>
  <rect class="d-box" x="300" y="113" width="90" height="44" rx="8"/>
  <text class="d-text" x="345" y="141" text-anchor="middle">str</text>
  <rect class="d-box" x="300" y="196" width="90" height="44" rx="8"/>
  <text class="d-text" x="345" y="224" text-anchor="middle">float</text>
  <rect class="d-box-accent" x="470" y="100" width="290" height="70" rx="10"/>
  <text class="d-text" x="615" y="131" text-anchor="middle">tuple[int, str, float]</text>
  <text class="d-sub" x="615" y="153" text-anchor="middle">return type tuple[*Ts]</text>
  <path class="d-edge" d="M 220 135 L 294 135" marker-end="url(#py23q5-arrow)"/>
  <path class="d-edge-accent" d="M 390 135 L 464 135" marker-end="url(#py23q5-arrow)"/>
</svg>

The checker binds \`Ts\` to the ordered list of argument types, then splices that list wherever \`*Ts\` appears in the return type.

mypy confirms it (line 31 of the demo file in section 4): \`Revealed type is "tuple[Literal[1]?, Literal['a']?, float]"\`. The \`Literal[...]?\` form is mypy saying "an \`int\` that came from the literal \`1\`".

## 3. Variadic Generic Classes: Array Shapes

~~~python
from typing import Generic, NewType, TypeVar, TypeVarTuple

DType = TypeVar("DType")
Shape = TypeVarTuple("Shape")

class Array(Generic[DType, *Shape]):
    def __init__(self, *shape: *Shape) -> None:
        self.shape = shape

Height = NewType("Height", int)
Width = NewType("Width", int)

def transpose(a: Array[DType, Height, Width]) -> Array[DType, Width, Height]: ...
~~~

\`Array[float, Height, Width]\` binds \`DType = float\` and \`Shape = (Height, Width)\`. Any number of dimensions works: \`Array[float]\` is a zero-dimensional array, \`Array[int, Height, Width, int]\` a three-dimensional one. Example 1 shows the runtime side: \`Array.__parameters__\` is \`(~DType, Shape)\` and \`get_args(Array[float, Height, Width])\` is \`(<class 'float'>, __main__.Height, __main__.Width)\`.

📌 **Interview term: prefix and suffix** — a TypeVarTuple can sit next to ordinary TypeVars. \`tuple[T, *Ts]\` matches any non-empty tuple, binding \`T\` to the first element type and \`Ts\` to the rest, which is how \`head_tail((1, "x", 2.0))\` is typed as \`tuple[int, tuple[str, float]]\`.

## 4. What the Checker Does With It

~~~python
from typing import Callable, Generic, NewType, TypeVar, TypeVarTuple

Shape = TypeVarTuple("Shape")
Ts = TypeVarTuple("Ts")
T = TypeVar("T")
R = TypeVar("R")
DType = TypeVar("DType")
Height = NewType("Height", int)
Width = NewType("Width", int)

class Array(Generic[DType, *Shape]):
    def __init__(self, *shape: *Shape) -> None:
        self.shape = shape

def as_tuple(*args: *Ts) -> tuple[*Ts]:
    return args

def head_tail(t: tuple[T, *Ts]) -> tuple[T, tuple[*Ts]]:
    return t[0], t[1:]

def transpose(a: "Array[DType, Height, Width]") -> "Array[DType, Width, Height]":
    h, w = a.shape
    return Array(Width(w), Height(h))

def call_soon(callback: Callable[[*Ts], R], *args: *Ts) -> None: ...

def greet(name: str, times: int) -> str:
    return name * times

image: Array[float, Height, Width] = Array(Height(2), Width(3))
reveal_type(as_tuple(1, "a", 2.5))
reveal_type(head_tail((1, "x", 2.0)))
reveal_type(transpose(image))
bad: Array[float, Height, Width] = transpose(image)
call_soon(greet, "ana", 2)
call_soon(greet, 42, 1)

class Bad(Generic[*Shape, *Ts]):
    pass
~~~

~~~text
variadic_demo.py:31: note: Revealed type is "tuple[Literal[1]?, Literal['a']?, float]"
variadic_demo.py:32: note: Revealed type is "tuple[int, tuple[Literal['x']?, float]]"
variadic_demo.py:33: note: Revealed type is "variadic_demo.Array[float, variadic_demo.Width, variadic_demo.Height]"
variadic_demo.py:34: error: Incompatible types in assignment (expression has type "Array[float, Width, Height]", variable has type "Array[float, Height, Width]")  [assignment]
variadic_demo.py:36: error: Argument 1 to "call_soon" has incompatible type "Callable[[str, int], str]"; expected "Callable[[int, int], str]"  [arg-type]
variadic_demo.py:38: error: Can only use one type var tuple in a class def  [misc]
Found 3 errors in 1 file (checked 1 source file)
~~~

Reading the output:

- **Lines 31-32:** each argument type is kept in order; \`head_tail\` splits off the first.
- **Lines 33-34:** \`transpose\` swaps the shape, and assigning the result back to an \`Array[float, Height, Width]\` is rejected. That is shape checking with no runtime cost.
- **Lines 35-36:** \`call_soon(greet, "ana", 2)\` is accepted; \`call_soon(greet, 42, 1)\` is rejected because \`Ts\` was bound to \`(int, int)\` from the arguments, and \`greet\` needs \`(str, int)\`.
- **Line 38:** two TypeVarTuples in one class are not allowed: the checker could not tell where one ends and the other begins.

## 5. Typing a Callback and Its Arguments

📌 **Interview term: \`Callable[[*Ts], R]\`** — "a function whose positional parameters are exactly \`Ts\`, returning \`R\`". Paired with \`*args: *Ts\`, it ties a callback to the arguments passed alongside it. This is not a toy: the typeshed stubs bundled with mypy 2.3.1 declare \`asyncio\`'s \`call_soon\` as

~~~python
def call_soon(
    self, callback: Callable[[Unpack[_Ts]], object], *args: Unpack[_Ts], context: Context | None = None
) -> Handle: ...
~~~

and \`_thread.start_new_thread(function, args)\` the same way with \`args: tuple[Unpack[_Ts]]\`.

Example 2 builds that scheduler and runs it. The bad call \`s.call_soon(greet, 42, 1)\` is accepted at runtime, and the mistake only shows up when the job runs: \`TypeError: can only concatenate str (not "int") to str\`. A checker reports it at the line where it was written.

### TypeVarTuple vs ParamSpec

| | \`TypeVarTuple\` (\`*Ts\`) | \`ParamSpec\` (\`**P\`) |
| :--- | :--- | :--- |
| Captures | positional argument types, in order | the whole signature: positional and keyword |
| Typical use | \`call_soon(callback, *args)\`, shapes, tuples | decorators, \`executor.submit(fn, *args, **kwargs)\` |
| Usable in tuples and classes | yes: \`tuple[*Ts]\`, \`Array[*Shape]\` | no |
| Typeshed example | \`asyncio\` \`call_soon\` | \`Executor.submit(self, fn: Callable[_P, _T], /, *args: _P.args, **kwargs: _P.kwargs)\` |

The rule of thumb: if keyword arguments are forwarded too, you need \`ParamSpec\`; if the types are a positional list you want to splice into tuples or classes, you need \`TypeVarTuple\`.

## 6. Unpacking Concrete Tuple Types

The star also works on real tuple types, not just on TypeVarTuples:

- \`*args: *tuple[int, str]\` means exactly two positional arguments, an \`int\` then a \`str\`.
- \`*args: *tuple[str, *tuple[int, ...]]\` means a \`str\` followed by any number of \`int\`s. Example 2 runs \`log_all("total", 1, 2, 3)\` with that annotation and prints its annotation object, \`*tuple[str, *tuple[int, ...]]\`.

A different, later use of \`Unpack\` is \`**kwargs: Unpack[SomeTypedDict]\` for keyword arguments; that one has its own page: [Unpack and TypedDict for **kwargs](/interview-question/how-do-unpack-and-typeddict-enable-type-safe-kwargs).

## 7. Runtime Behaviour and Version Notes

- **Nothing is enforced.** As with every hint, \`Array[float, Height, Width]\` is erased; Example 1 creates an array and \`a.shape\` is just the tuple \`(2, 3)\`.
- **The one-TypeVarTuple rule is the checker's.** On our 3.11 run, \`class Bad(Generic[*Shape, *Ts])\` was created without any error (\`Bad.__parameters__\` was \`(Shape, Ts)\`), while mypy rejected it (line 38 above).
- **\`*Ts\` annotations only on \`*args\`.** \`def g(x: *Ts)\` is a \`SyntaxError\` on 3.11 (\`invalid syntax\` in our run).
- **Reprs changed.** On 3.11 \`Unpack[Shape]\` prints as \`*Shape\`; on our 3.13 run the same line printed \`typing.Unpack[Shape]\`, and \`as_tuple.__annotations__\` printed \`typing.Unpack[Ts]\` instead of \`*Ts\`. Do not compare reprs across versions.
- **3.12 syntax.** With [the new type parameter syntax](/interview-question/what-is-python-3-12-s-new-type-parameter-syntax-type-generic-classes) you write \`class Array[DType, *Shape]:\` and \`def as_tuple[*Ts](*args: *Ts) -> tuple[*Ts]\`; in a 3.12 check \`Array.__type_params__\` was \`(DType, Shape)\` with \`Shape\` a \`TypeVarTuple\`.
- **3.13 defaults.** PEP 696 lets \`TypeVarTuple\` take a default too ([What is new in 3.13](https://docs.python.org/3.13/whatsnew/3.13.html)).

## 8. Verified: Running the Code

Both examples were run on python3.11 and in the page runner (Pyodide 0.25.1). Example 1, *TypeVarTuple in a generic Array*, printed:

~~~text
(~DType, Shape)
(<class 'float'>, __main__.Height, __main__.Width)
__main__.Array[float]
(__main__.Height, __main__.Width, <class 'int'>)
(2, 3)
Shape *Shape
True
True
(1, 'a', 2.5)
{'args': *Ts, 'return': tuple[*Ts]}
(1, ('x', 2.0))
(Shape, Ts)
~~~

Example 2, *a typed scheduler and unpacked tuple types*, printed:

~~~text
greet ('ana', 2) -> hi ana hi ana
area (2.0, 3.5) -> 7.0
TypeError: can only concatenate str (not "int") to str
total 6
*tuple[str, *tuple[int, ...]]
~~~

The mypy output in section 4 came from mypy 2.3.1 on the demo file shown; the typeshed signatures in section 5 were read from the stubs bundled with that mypy.

## Common Pitfalls

- **Using \`Ts\` bare.** \`tuple[Ts]\` or \`Generic[Ts]\` is wrong; a TypeVarTuple must be unpacked: \`tuple[*Ts]\`, \`Generic[*Ts]\`.
- **Two TypeVarTuples in one list.** \`Generic[*A, *B]\` is ambiguous and checkers reject it, even though the runtime does not.
- **Reaching for TypeVarTuple when keywords are involved.** It only covers positional arguments; forwarding \`**kwargs\` needs \`ParamSpec\`.
- **Expecting runtime shape checks.** The shape is in the type only; \`Array[float, Height, Width]\` validates nothing when constructed.
- **Assuming every checker handles every case.** PEP 646 itself was accepted with details of multiple unpackings left unspecified; check your checker on complex signatures with \`reveal_type\`.
- **Writing \`*Ts\` syntax in 3.10-compatible code.** Use \`Unpack[Ts]\` from \`typing_extensions\` there.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeVarTuple</code> is a type variable for <strong style="color:#ffca28;">any number of types, in order</strong>. PEP 646 added it in Python 3.11. It is always used unpacked, as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*Ts</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Unpack[Ts]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Typed *args:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def as_tuple(*args: *Ts) -&gt; tuple[*Ts]</code> keeps every argument type: called with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(1, "a", 2.5)</code> it returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple[int, str, float]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Callbacks:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Callable[[*Ts], R]</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args: *Ts</code> checks that forwarded arguments fit the callback. typeshed types <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call_soon</code> exactly this way.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Variadic classes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Array(Generic[DType, *Shape])</code> lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array[float, Height, Width]</code> carry a shape, so a checker can reject a transposed array. Mix with TypeVars for prefix and suffix: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple[T, *Ts]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits:</strong> <span style="color:#f0e2c8;">Only one TypeVarTuple per parameter list, positional arguments only (keywords need <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ParamSpec</code>), and nothing is checked at runtime. 3.12 writes it <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">class Array[*Shape]</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*Ts</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Unpack[Ts]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">None in meaning. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Unpack[Ts]</code> is the spelling for places the star is not allowed and for older versions through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing_extensions</code>; from 3.11 the star works in subscripts and on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*args</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why only one TypeVarTuple in a class?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Generic[*A, *B]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">C[int, str, float]</code> there is no way to know where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A</code> ends and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">B</code> starts. One TypeVarTuple plus fixed TypeVars before or after it is unambiguous.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">ParamSpec</code> instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When keyword arguments are forwarded too, as in decorators or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">executor.submit(fn, *args, **kwargs)</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ParamSpec</code> captures a whole signature; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeVarTuple</code> captures only an ordered list of positional types.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Array[float, Height, Width]</code> check shapes at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is erased like every type argument. The benefit is static: a checker rejects passing an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Array[float, Width, Height]</code> where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Height, Width</code> is expected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you type a function taking a string then any number of ints as <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">*args</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def f(*args: *tuple[str, *tuple[int, ...]])</code>. The star unpacks a concrete tuple type, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tuple[int, ...]</code> inside it is the unbounded part.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| TypeVarTuple | A type variable for an ordered sequence of zero or more types (PEP 646, 3.11) |
| Variadic generic | A generic class or function with a variable number of type parameters |
| Unpacking (\`*Ts\` / \`Unpack[Ts]\`) | Splicing the types of a TypeVarTuple or tuple type into a list |
| Prefix and suffix | Fixed TypeVars before or after \`*Ts\`, as in \`tuple[T, *Ts]\` |
| \`Callable[[*Ts], R]\` | A function whose positional parameter types are exactly \`Ts\` |

**Conclusion:** A \`TypeVarTuple\` is a type variable for a whole ordered list of types, added in Python 3.11 by PEP 646 and always used unpacked as \`*Ts\` or \`Unpack[Ts]\`. It makes two things typeable that a single \`TypeVar\` cannot: generic classes with a variable number of parameters, such as \`Array[float, Height, Width]\` where the checker can catch a transposed shape, and functions that forward positional arguments, such as \`call_soon(callback: Callable[[*Ts], R], *args: *Ts)\`, which is exactly how typeshed types \`asyncio\`. It combines with ordinary TypeVars for prefix and suffix patterns, works alongside unpacked concrete tuples like \`*tuple[int, ...]\`, and stops where keyword arguments begin (that is \`ParamSpec\`). Only one is allowed per parameter list, \`*Ts\` annotations go only on \`*args\`, and, like every hint, none of it is checked at runtime.`,
    examples: [
      {
        label: `TypeVarTuple in a generic Array, *Ts vs Unpack, typed *args and head/tail`,
        code: `from typing import Generic, NewType, TypeVar, TypeVarTuple, Unpack, get_args

# 1. A TypeVarTuple stands for ANY NUMBER of types, in order.
Shape = TypeVarTuple("Shape")
DType = TypeVar("DType")

class Array(Generic[DType, *Shape]):
    def __init__(self, data: list, *shape: *Shape) -> None:
        self.data = data
        self.shape = shape

Height = NewType("Height", int)
Width = NewType("Width", int)

print(Array.__parameters__)
img = Array[float, Height, Width]
print(get_args(img))
print(Array[float])
print(Array[int, Height, Width, int].__args__[1:])

a = Array([0.0] * 6, Height(2), Width(3))
print(a.shape)  # (2, 3)

# 2. *Ts and Unpack[Ts] are two spellings of the same thing.
print(Shape, Unpack[Shape])
print(tuple[*Shape] == tuple[Unpack[Shape]])  # True
print([*Shape] == [Unpack[Shape]])  # True

# 3. A function that keeps every argument type, in order.
Ts = TypeVarTuple("Ts")

def as_tuple(*args: *Ts) -> tuple[*Ts]:
    return args

print(as_tuple(1, "a", 2.5))  # (1, 'a', 2.5)
print(as_tuple.__annotations__)

# 4. Prefix and suffix: peel the first type off a tuple.
T = TypeVar("T")

def head_tail(t: tuple[T, *Ts]) -> tuple[T, tuple[*Ts]]:
    return t[0], t[1:]

print(head_tail((1, "x", 2.0)))  # (1, ('x', 2.0))

# 5. Only one TypeVarTuple per class is allowed, but that rule
#    belongs to the type checker: the runtime accepts this.
class Bad(Generic[*Shape, *Ts]):
    pass

print(Bad.__parameters__)  # (Shape, Ts)`,
      },
      {
        label: `A typed call_soon(callback, *args) scheduler, and unpacking tuple types`,
        code: `from typing import Callable, TypeVar, TypeVarTuple

# A scheduler that stores a callback and its arguments, the way
# asyncio loop.call_soon(callback, *args) does. With *Ts, a type
# checker can verify that args match what callback expects.
Ts = TypeVarTuple("Ts")
R = TypeVar("R")

class Scheduler:
    def __init__(self) -> None:
        self.jobs: list[tuple[Callable[..., object], tuple[object, ...]]] = []

    def call_soon(self, callback: Callable[[*Ts], R], *args: *Ts) -> None:
        self.jobs.append((callback, args))

    def run(self) -> None:
        for callback, args in self.jobs:
            print(callback.__name__, args, "->", callback(*args))

def greet(name: str, times: int) -> str:
    return " ".join(["hi " + name] * times)

def area(w: float, h: float) -> float:
    return w * h

s = Scheduler()
s.call_soon(greet, "ana", 2)
s.call_soon(area, 2.0, 3.5)
# A type checker rejects the next line (int where str is expected);
# at runtime the mistake only shows up when the job runs.
s.call_soon(greet, 42, 1)
try:
    s.run()
except TypeError as err:
    print("TypeError:", err)

# Unbounded and fixed-length tuples can be unpacked too.
def log_all(*args: *tuple[str, *tuple[int, ...]]) -> None:
    print(args[0], sum(args[1:]))

log_all("total", 1, 2, 3)
print(log_all.__annotations__["args"])`,
      },
    ],
  },
];

export default augments;
