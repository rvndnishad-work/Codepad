/**
 * PYTHON ULTRA — batch 24: Type hints II and pattern matching — Unpack[TypedDict] for **kwargs,
 * match/case, exhaustiveness, typing.Never, and Pydantic v2 validation.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (the Pydantic examples, runnable: false, on python3.13 with
 * pydantic 2.13.5); quoted output is that run's output. Type-checker output quoted in the answers
 * comes from mypy 2.3.1 and pyright 1.1.414.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do Unpack and TypedDict enable type-safe **kwargs?`,
    difficulty: "hard",
    seoDescription: `Typing **kwargs per key in Python: TypedDict plus Unpack (PEP 692), Required/NotRequired, what mypy and pyright report, and what runtime never checks.`,
    description: `**Question presented to candidate:**
"Say a function takes a bunch of optional settings through \`**kwargs\` — timeout, retries, verbose. How would you type that so a checker catches a misspelled keyword or a wrong value type? What do \`TypedDict\` and \`Unpack\` each contribute, and what happens at runtime?"

**What a strong answer should cover:**
- The old form \`**kwargs: int\` types every value the same; it cannot give each keyword its own name and type, and inside the function \`kwargs\` is \`dict[str, int]\`.
- \`**kwargs: Unpack[SomeTypedDict]\` (PEP 692, Python 3.12; \`typing_extensions\` before that, and \`typing.Unpack\` itself exists from 3.11) tells the checker the function accepts exactly those keyword names, each with its own type.
- \`total=False\`, \`Required[...]\` and \`NotRequired[...]\` (PEP 655, 3.11) decide which keywords are mandatory; required keys become required keyword arguments, the rest optional.
- Checkers report unknown names, wrong types, missing required keys and a named parameter that overlaps a TypedDict key; inside the function \`kwargs\` has the TypedDict type.
- Nothing is checked at runtime: the annotation is metadata, \`kwargs\` is a plain \`dict\`, and a typo still runs. Validate at the boundary if the input is untrusted.
- Trade-off against explicit keyword-only parameters: Unpack shines when the same option set is shared by several functions or wrappers that forward \`**kwargs\`.

**Clarifying questions expected:**
- Which Python version and type checker does the codebase use (3.12+ \`typing.Unpack\` support, or \`typing_extensions\`)?
- Do the options come from Python callers only, or also from untrusted data that needs runtime validation?

**Code / implementation expected:** Yes — a TypedDict, a function using \`**kwargs: Unpack[...]\`, and the checker errors it produces.`,
    answer: `**Target Audience:** Python developers who know what \`**kwargs\` is and have written a few type hints, and want to type keyword arguments precisely.
**Difficulty:** Hard
**Python version:** Runtime behaviour checked on CPython 3.11, 3.12 and 3.13; both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3). Type-checker output is from mypy 2.3.1 and pyright 1.1.414.

> **How to read this doc:** Every idea is explained in plain language first. The exact words an interviewer expects are tagged \`📌 Interview term:\` and defined on the spot; all of them are collected in the Quick Glossary at the end. Every output shown here was printed by a real run.

## 1. Why This Even Matters — A Story First

Picture a coffee shop with an order form that has one big free-text box labelled "extras". People write "oat milk", "extra shot", "oat mlik", "3 sugars", "sugar: lots". The barista finds out what is wrong only when the order is being made.

Now replace the free-text box with a form that has named fields: **milk** (a choice), **shots** (a number), **sugar** (a number). Misspelled fields cannot exist and "lots" cannot go into a number box. You still do not have to fill every field — but every field you fill is checked *before* the order reaches the barista.

\`**kwargs\` is the free-text box: any name, any value. A \`TypedDict\` is the form design, and \`Unpack[...]\` is the instruction "this function's extras box uses that form". The checker — mypy, pyright, your editor — is the person who looks at the form before it is handed over. Interviewers ask about it because wrappers, HTTP clients, plotting libraries and config helpers all pass options through \`**kwargs\`, and without this feature those calls are invisible to the type checker.

## 2. The Problem With the Old Way

You already know [what \`*args\` and \`**kwargs\` mean](/interview-question/what-do-args-and-kwargs-mean): \`**kwargs\` collects every extra keyword argument into a dict. Before Python 3.12 the only way to annotate it was:

~~~python
def old_inside(**kwargs: float) -> None:
    reveal_type(kwargs)
~~~

That annotation means "every value is a float". It says nothing about *which names* are allowed, and mypy shows the type inside the function as \`dict[str, float]\` (the \`old_inside\` line in the mypy output of section 4). So \`fetch(timout=2.0)\` (a typo) passes the checker, and mixed types such as \`timeout: float\` plus \`retries: int\` cannot be expressed at all — you end up with \`**kwargs: Any\`.

📌 **Interview term: Type checker** — a separate program (mypy, pyright, pyre, the checker inside your editor) that reads your annotations and reports mistakes without running the code. CPython itself does not check annotations. The [type hints question](/interview-question/how-do-type-hints-work-in-python) covers the basics.

## 3. The Two Pieces: TypedDict and Unpack

📌 **Interview term: \`TypedDict\`** — a way to describe the *shape* of a dict: which string keys it has and the type of each value. \`class Options(TypedDict, total=False): timeout: float\` says "a dict that may have a \`timeout\` key holding a float". At runtime calling \`Options(...)\` just makes an ordinary \`dict\`.

📌 **Interview term: \`total=False\`** — a class keyword that makes every key of that TypedDict optional (not required to be present). The default, \`total=True\`, makes every key required.

📌 **Interview term: \`Required[...]\` / \`NotRequired[...]\`** — per-key overrides of \`total\` (PEP 655, Python 3.11 — listed on the [typing PEPs index](https://peps.python.org/topic/typing)). \`method: NotRequired[str]\` in a total TypedDict makes just that key optional; \`trace_id: Required[str]\` in a \`total=False\` TypedDict makes just that key mandatory.

📌 **Interview term: \`Unpack[...]\`** — a typing form that means "spread this out". For \`**kwargs\`, \`**kwargs: Unpack[Options]\` means "the keyword arguments are the *keys* of \`Options\`, each with its own type", instead of "each value is an \`Options\`". This use was added by [PEP 692](https://peps.python.org/pep-0692/) (Final, Python 3.12). The name \`typing.Unpack\` itself first appeared in 3.11 for [variadic generics (PEP 646)](https://peps.python.org/pep-0646/), which is why the import works on 3.11 too; older checkers or Pythons use \`typing_extensions.Unpack\`. The other use is covered in [TypeVarTuple and Unpack](/interview-question/what-is-typevartuple-and-unpack-for-variadic-generics).

Why is \`Unpack\` needed at all? Because \`**kwargs: Options\` already has a meaning: "each keyword value is an \`Options\` dict". The extra word says "the TypedDict describes the *whole* set of keyword arguments".

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="Each key of the TypedDict becomes one keyword-only parameter of the function: required keys become required keywords and optional keys become keywords with a default">
  <defs>
    <marker id="py24q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="270" height="220" rx="10"/>
  <text class="d-text" x="155" y="62" text-anchor="middle">class Request(TypedDict)</text>
  <text class="d-sub" x="45" y="112">url: str</text>
  <text class="d-sub" x="45" y="162">method: NotRequired[str]</text>
  <text class="d-sub" x="45" y="212">timeout: NotRequired[float]</text>
  <rect class="d-box-accent" x="430" y="30" width="270" height="220" rx="10"/>
  <text class="d-text" x="565" y="62" text-anchor="middle">what the checker sees</text>
  <text class="d-sub" x="455" y="112">*, url: str</text>
  <text class="d-sub" x="455" y="162">method: str = ...</text>
  <text class="d-sub" x="455" y="212">timeout: float = ...</text>
  <line class="d-edge-accent" x1="290" y1="108" x2="425" y2="108" marker-end="url(#py24q1-arrow)"/>
  <line class="d-edge" x1="290" y1="158" x2="425" y2="158" marker-end="url(#py24q1-arrow)"/>
  <line class="d-edge" x1="290" y1="208" x2="425" y2="208" marker-end="url(#py24q1-arrow)"/>
</svg>

Each key becomes one keyword-only parameter: a required key becomes a required keyword, a not-required key becomes a keyword with a default. Example 2 builds this exact signature with \`inspect\` so you can see it print.

## 4. What the Checker Reports

Here is a small file that uses the feature correctly once and gets it wrong in every common way:

~~~python
from typing import TypedDict, Unpack, NotRequired


class Options(TypedDict, total=False):
    timeout: float
    retries: int


class Request(TypedDict):
    url: str
    method: NotRequired[str]


def fetch(**kwargs: Unpack[Options]) -> None: ...
def call(**kwargs: Unpack[Request]) -> None: ...


fetch(timeout=2.0)          # fine
fetch(timout=2.0)           # typo in the name
fetch(retries="3")          # wrong value type
call(method="GET")          # required key missing
reveal_type(fetch)


def inside(**kwargs: Unpack[Options]) -> None:
    reveal_type(kwargs)
    reveal_type(kwargs.get("timeout"))


def old_inside(**kwargs: float) -> None:
    reveal_type(kwargs)


def clash(timeout: int, **kwargs: Unpack[Options]) -> None: ...


untyped = {"timeout": 1.0}
fetch(**untyped)            # a plain dict[str, float] is not an Options
~~~

mypy 2.3.1 on that file (\`mypy q1_check.py\`):

~~~text
q1_check.py:19: error: Unexpected keyword argument "timout" for "fetch"; did you mean "timeout"?  [call-arg]
q1_check.py:20: error: Argument "retries" to "fetch" has incompatible type "str"; expected "int"  [arg-type]
q1_check.py:21: error: Missing named argument "url" for "call"  [call-arg]
q1_check.py:22: note: Revealed type is "def (**kwargs: **TypedDict(q1_check.Options, {'timeout'?: float, 'retries'?: int}))"
q1_check.py:26: note: Revealed type is "TypedDict(q1_check.Options, {'timeout'?: float, 'retries'?: int})"
q1_check.py:27: note: Revealed type is "float | None"
q1_check.py:31: note: Revealed type is "dict[str, float]"
q1_check.py:34: error: Overlap between parameter names and ** TypedDict items: "timeout"  [misc]
q1_check.py:38: error: Argument 1 to "fetch" has incompatible type "**dict[str, float]"; expected "int"  [arg-type]
Found 5 errors in 1 file (checked 1 source file)
~~~

pyright 1.1.414 on the same file (file path shortened):

~~~text
  q1_check.py:19:7 - error: No parameter named "timout" (reportCallIssue)
  q1_check.py:20:15 - error: Argument of type "Literal['3']" cannot be assigned to parameter "retries" of type "int" in function "fetch"
    "Literal['3']" is not assignable to "int" (reportArgumentType)
  q1_check.py:21:1 - error: Argument missing for parameter "url" (reportCallIssue)
  q1_check.py:22:13 - information: Type of "fetch" is "(**kwargs: **Options) -> None"
  q1_check.py:26:17 - information: Type of "kwargs" is "Options"
  q1_check.py:27:17 - information: Type of "kwargs.get("timeout")" is "float | None"
  q1_check.py:31:17 - information: Type of "kwargs" is "dict[str, float]"
  q1_check.py:34:35 - error: Typed dictionary overlaps with keyword parameter: timeout (reportGeneralTypeIssues)
  q1_check.py:38:9 - error: Argument of type "float" cannot be assigned to parameter "retries" of type "int" in function "fetch"
    "float" is not assignable to "int" (reportArgumentType)
5 errors, 0 warnings, 4 informations
~~~

Both checkers agree on every point:

| Mistake in the call or definition | Caught? | Why |
| :--- | :--- | :--- |
| Misspelled keyword (\`timout=\`) | Yes | Only the TypedDict keys are accepted names |
| Wrong value type (\`retries="3"\`) | Yes | Each key has its own type |
| Required key missing (\`call(method=...)\`) | Yes | \`url\` is required in \`Request\`, so the keyword is required |
| Named parameter with the same name as a key | Yes, at the definition | \`timeout\` would be passed twice |
| Splatting an untyped \`dict[str, float]\` | Yes | A plain dict could hold any key, so every float value is checked against every parameter |
| Typo when called with values that only arrive at runtime (JSON, CLI) | **No** | The checker never sees runtime data |

📌 **Interview term: \`reveal_type()\`** — a special call understood by mypy and pyright that makes the checker print the type it inferred for an expression. On Python 3.11 \`typing.reveal_type\` also exists at runtime (it printed \`Runtime type is 'int'\` on our run), but the useful output is the checker's.

Inside the function, \`kwargs\` has the TypedDict type, so \`kwargs.get("timeout")\` is \`float | None\`. Indexing a not-required key directly, \`return kwargs["timeout"]\`, is where the checkers differ: on our run pyright reported \`"timeout" is not a required key in "Options", so access may result in runtime exception (reportTypedDictNotRequiredAccess)\`, while \`mypy --strict\` reported nothing. That is the second benefit: the body of the function is checked too, not just the callers.

## 5. Runtime: Nothing Is Enforced

The annotation is metadata stored on the function. CPython never reads it during a call. Example 1 calls \`fetch("/a", timout="oops")\` and it simply runs, printing \`GET /a with ['timout']\`. What you *can* do at runtime is read the metadata:

- \`typing.get_type_hints(fetch)["kwargs"]\` is \`Unpack[Options]\` (its \`get_origin\` is \`Unpack\`, its argument is the class),
- \`Options.__required_keys__\` and \`Options.__optional_keys__\` are frozensets of key names,
- \`typing.get_type_hints(Options)\` maps each key to its type.

That is enough to write a tiny check for data that comes from outside Python (config files, CLI flags, JSON), shown in Example 1. For anything serious use a validation library: [Pydantic v2](/interview-question/how-does-pydantic-v2-validation-work-basemodel-field-validator-mode) can validate a TypedDict through a \`TypeAdapter\` (see [TypeAdapter and strict mode](/interview-question/how-do-typeadapter-strict-mode-and-computed-fields-work-in-pydantic-v2)).

One runtime detail differs by version: the *repr* of the annotation. On 3.11, \`fetch.__annotations__\` showed \`{'kwargs': *<class '__main__.Options'>, 'return': None}\`; on 3.12 and 3.13 it showed \`{'kwargs': typing.Unpack[__main__.Options], 'return': None}\`. The examples print \`get_origin(...).__name__\` instead, which is the same everywhere.

## 6. Walking Through the Code

**Example 1** has three parts.

~~~python
class Options(TypedDict, total=False):
    timeout: float
    retries: int
    verbose: bool


def fetch(url: str, **kwargs: Unpack[Options]) -> str:
    return f"GET {url} with {sorted(kwargs)}"
~~~

1. Two calls, one correct and one with a typo and a wrong type. Both run — proof that the runtime ignores the annotation.
2. Introspection: the origin of the hint is \`Unpack\`, its argument is \`Options\`; with \`total=False\` every key is optional and none required.
3. \`check_kwargs(td, kwargs)\` walks the kwargs, rejects unknown names and wrong \`isinstance\` types, then reports required keys that are missing. It handles only plain classes like \`float\` and \`int\`, not \`list[int]\` or unions — a deliberate toy.

**Example 2** shows the checker's point of view. \`as_keyword_only(td)\` builds an \`inspect.Signature\` with one \`KEYWORD_ONLY\` parameter per key, using \`...\` as the default for keys that are not required. The output \`(*, url: str, method: str = ..., timeout: float = ..., trace_id: str)\` is exactly how mypy and pyright treat \`**kwargs: Unpack[Extra]\`. Note \`Extra(Base, total=False)\`: \`total=False\` affects only the keys declared in \`Extra\` (so \`timeout\` is optional), \`trace_id: Required[str]\` overrides it, and the inherited \`url\` stays required.

The last part is the main real-world use: \`send_with_logging(**kwargs: Unpack[Extra])\` forwards \`**kwargs\` to \`send(**kwargs: Unpack[Extra])\`. Because both share the same TypedDict, the wrapper is fully checked without repeating the parameter list. And \`type(kwargs)\` is always \`dict\`.

## 7. Verified: Running the Code

Example 1 on python3.11 (identical in the page on Pyodide and on 3.12/3.13):

~~~text
GET /a with ['timeout']
GET /a with ['timout']
Unpack Options
['retries', 'timeout', 'verbose']
[]
[]
["unexpected keyword 'timout'", 'retries: expected int, got str']
["missing keyword 'url'"]
['url'] ['method']
~~~

Example 2:

~~~text
Base : (*, url: str, method: str = ...)
Extra: (*, url: str, method: str = ..., timeout: float = ..., trace_id: str)
['trace_id', 'url']
  log keys: ['trace_id', 'url']
GET /items trace=t-1
  log keys: ['method', 'timeout', 'trace_id', 'url']
POST /items trace=t-2
dict
~~~

## 8. Unpack[TypedDict] vs the Alternatives

| Approach | Per-key types | Allowed names checked | Reusable across functions | Notes |
| :--- | :--- | :--- | :--- | :--- |
| \`**kwargs: Any\` | No | No | — | No checking at all |
| \`**kwargs: float\` | Only if all values share one type | No | — | \`kwargs\` is \`dict[str, float]\` |
| Explicit keyword-only params \`def f(*, timeout: float = 1.0, retries: int = 0)\` | Yes | Yes | No — repeat the list in every wrapper | Real defaults visible at runtime; best for one function |
| \`**kwargs: Unpack[Options]\` | Yes | Yes | Yes — one TypedDict, many functions | No runtime defaults: use \`kwargs.get("timeout", 1.0)\` |
| A dataclass or Pydantic model parameter \`f(options: Options)\` | Yes | Yes | Yes | Changes the call style; can validate at runtime |

## 9. Edge Cases

- **Defaults live in the body.** A TypedDict has no default values, so the function decides: \`timeout = kwargs.get("timeout", 1.0)\`.
- **Extra keys.** A standard TypedDict accepts no extra keyword names in calls, so you cannot mix "these named options plus anything else" in one \`**kwargs\`; that limitation was raised in the [PEP 692 discussion](https://discuss.python.org/t/pep-692-using-typeddict-for-more-precise-kwargs-typing/17314). Use a separate parameter for free-form extras.
- **Read-only keys.** \`ReadOnly[...]\` for TypedDict items was added by [PEP 705](https://peps.python.org/pep-0705/) for Python 3.13; like everything here it is checked only statically.
- **\`**kwargs\` stays keyword-only.** Positional arguments cannot fill TypedDict keys.

## Common Pitfalls

- **Writing \`**kwargs: Options\` without \`Unpack\`.** That means each *value* is an \`Options\` dict — legal, but almost never what you meant.
- **Assuming runtime enforcement.** \`fetch(timout=...)\` runs fine. If keyword names come from JSON or a CLI, validate them yourself.
- **Declaring a named parameter that is also a TypedDict key.** Both checkers reject \`def clash(timeout: int, **kwargs: Unpack[Options])\` because the value would arrive twice.
- **Splatting an untyped dict.** \`fetch(**{"timeout": 1.0})\` built in a variable is \`dict[str, float]\`, which the checker cannot prove fits; annotate the variable as \`Options\` instead.
- **Forgetting \`total=False\` / \`NotRequired\`.** Without them every key is required, so callers must pass every option.
- **Old tooling.** On a checker that does not support PEP 692 yet, import \`Unpack\` from \`typing_extensions\` and check your checker version.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs: float</code> gives every value one type and allows any name, so typos and mixed types slip through. Inside, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kwargs</code> is just <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict[str, float]</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The fix:</strong> <span style="color:#f0e2c8;">Describe the options as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypedDict</code> and annotate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs: Unpack[Options]</code> (PEP 692, Python 3.12, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing_extensions</code>). Each key becomes its own keyword with its own type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Required vs optional:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total=False</code> makes keys optional; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Required[...]</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NotRequired[...]</code> override it per key. Required keys become required keyword arguments.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What is checked:</strong> <span style="color:#f0e2c8;">mypy and pyright reject unknown names, wrong types, missing required keys and a named parameter that overlaps a key; inside the body <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kwargs</code> has the TypedDict type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What is not:</strong> <span style="color:#f0e2c8;">The runtime ignores it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kwargs</code> is a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code> and a typo still runs. Validate untrusted input separately, for example with Pydantic.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do you need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Unpack</code> at all — why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">**kwargs: Options</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**kwargs: Options</code> already means "every keyword value is an Options dict". <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Unpack</code> says the TypedDict describes the whole keyword set, one key per keyword.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you prefer explicit keyword-only parameters?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For one function: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">def f(*, timeout: float = 1.0)</code> has real defaults and shows in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">help()</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Unpack</code> wins when several functions or wrappers share and forward the same options.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do defaults work with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Unpack</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A TypedDict has no defaults, so the body supplies them: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kwargs.get("timeout", 1.0)</code>. The checker treats a not-required key as an optional keyword.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is anything checked at runtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The hint is stored in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__annotations__</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get_type_hints</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__required_keys__</code> let a library inspect it, but CPython never enforces it during a call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does mypy say if a parameter name overlaps a key?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On our run mypy printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Overlap between parameter names and ** TypedDict items: "timeout"</code> and pyright printed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Typed dictionary overlaps with keyword parameter: timeout</code>. Rename the parameter or drop the key.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Type checker | A separate tool (mypy, pyright) that checks annotations without running the code |
| \`TypedDict\` | A description of a dict shape: string keys and a type per value; a plain \`dict\` at runtime |
| \`total=False\` | Makes every key declared in that TypedDict optional |
| \`Required[...]\` / \`NotRequired[...]\` | Per-key overrides of \`total\` (PEP 655, Python 3.11) |
| \`Unpack[...]\` | "Spread this out": with \`**kwargs\`, the TypedDict keys become the keyword arguments (PEP 692, 3.12) |
| \`reveal_type()\` | A call that makes the checker print the inferred type of an expression |

**Conclusion:** \`**kwargs: Unpack[Options]\` turns the free-for-all of \`**kwargs\` into a named, typed set of keyword arguments: each \`TypedDict\` key becomes a keyword-only parameter, \`total\`, \`Required\` and \`NotRequired\` decide which ones are mandatory, and mypy and pyright then catch typos, wrong types, missing keys and overlapping names — in callers and inside the function body. It is purely static: at runtime \`kwargs\` is still a plain dict and nothing is validated, so pair it with real validation wherever the keywords come from outside your code.`,
    examples: [
      {
        label: `Unpack[TypedDict] at runtime, its metadata, and a tiny runtime check`,
        code: `from typing import TypedDict, Unpack, NotRequired, get_type_hints, get_origin, get_args


class Options(TypedDict, total=False):
    timeout: float
    retries: int
    verbose: bool


def fetch(url: str, **kwargs: Unpack[Options]) -> str:
    return f"GET {url} with {sorted(kwargs)}"


# 1. The annotation is only metadata: Python itself never checks it.
print(fetch("/a", timeout=2.0))
# A typo and a wrong type: still runs.
print(fetch("/a", timout="oops"))

# 2. What a type checker (or a library) can read from the annotation.
hint = get_type_hints(fetch)["kwargs"]
print(get_origin(hint).__name__, get_args(hint)[0].__name__)
print(sorted(Options.__optional_keys__))  # ['retries', 'timeout', 'verbose']
print(sorted(Options.__required_keys__))  # []


# 3. A tiny runtime check built from the same TypedDict, for code that
#    receives keyword arguments from untrusted places (config, CLI, JSON).
def check_kwargs(td, kwargs):
    hints = get_type_hints(td)
    problems = []
    for key, value in kwargs.items():
        if key not in hints:
            problems.append(f"unexpected keyword {key!r}")
        elif not isinstance(value, hints[key]):
            problems.append(f"{key}: expected {hints[key].__name__}, got {type(value).__name__}")
    for key in sorted(td.__required_keys__ - kwargs.keys()):
        problems.append(f"missing keyword {key!r}")
    return problems


print(check_kwargs(Options, {"timeout": 2.0, "retries": 3}))
print(check_kwargs(Options, {"timout": 2.0, "retries": "3"}))


class Request(TypedDict):
    url: str
    method: NotRequired[str]


print(check_kwargs(Request, {"method": "GET"}))
print(sorted(Request.__required_keys__), sorted(Request.__optional_keys__))`,
      },
      {
        label: `The keyword-only signature a checker sees, Required/NotRequired and forwarding`,
        code: `import inspect
from typing import TypedDict, Unpack, Required, NotRequired, get_type_hints


class Base(TypedDict):
    url: str
    method: NotRequired[str]


class Extra(Base, total=False):
    timeout: float
    trace_id: Required[str]


class _Optional:
    def __repr__(self):
        return "..."


OPTIONAL = _Optional()


def as_keyword_only(td):
    """Build the signature a type checker treats **kwargs: Unpack[td] as."""
    params = []
    for name, tp in get_type_hints(td).items():
        default = inspect.Parameter.empty if name in td.__required_keys__ else OPTIONAL
        params.append(inspect.Parameter(name, inspect.Parameter.KEYWORD_ONLY,
                                        default=default, annotation=tp))
    return inspect.Signature(params)


# Required/NotRequired override the class-level total= setting, per key.
print("Base :", as_keyword_only(Base))
print("Extra:", as_keyword_only(Extra))
print(sorted(Extra.__required_keys__))  # ['trace_id', 'url']


# Forwarding: a wrapper with the same Unpack[...] can pass **kwargs straight on.
def send(**kwargs: Unpack[Extra]) -> str:
    return f"{kwargs.get('method', 'GET')} {kwargs['url']} trace={kwargs['trace_id']}"


def send_with_logging(**kwargs: Unpack[Extra]) -> str:
    print("  log keys:", sorted(kwargs))
    return send(**kwargs)


print(send_with_logging(url="/items", trace_id="t-1"))
print(send_with_logging(url="/items", method="POST", trace_id="t-2", timeout=1.5))

# At runtime **kwargs is always a plain dict, never a TypedDict instance.
def show(**kwargs: Unpack[Base]) -> str:
    return type(kwargs).__name__

print(show(url="/x"))  # dict`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is structural pattern matching (match/case)?`,
    difficulty: "medium",
    seoDescription: `Python match/case from zero: literal, capture, sequence, mapping, class, OR and AS patterns, guards, __match_args__ and the gotchas, all run on 3.11.`,
    description: `**Question presented to candidate:**
"Python 3.10 added \`match\` and \`case\`. Is it just a switch statement? Walk me through the kinds of patterns you can write, and tell me about a gotcha that catches people out."

**What a strong answer should cover:**
- It is *structural*: a pattern checks the shape of the subject (type, length, keys, attributes) and binds parts of it to names, not just compares values. Cases are tried top to bottom and the first match wins; no fall-through.
- The pattern kinds: literal, capture, wildcard \`_\`, value (dotted name), sequence (with \`*rest\`), mapping (with \`**rest\`), class (\`Point(x=0)\`, positional via \`__match_args__\`), OR \`|\`, AS \`as\`, plus \`if\` guards.
- The capture gotcha: a bare name such as \`case RED:\` binds anything; constants must be dotted (\`Color.RED\`). CPython rejects a bare-name case that is not last with a SyntaxError.
- Rules that surprise people: \`str\`/\`bytes\` never match sequence patterns, mapping patterns ignore extra keys, \`case 1:\` matches \`True\` (== comparison) while \`True\`/\`False\`/\`None\` compare with \`is\`, and no matching case is silently a no-op.
- When to use it: parsing commands, tagged JSON-like data, AST and message handling. A dict of handlers or plain \`if\` is still better for simple value lookups.

**Code / implementation expected:** Optional — a short \`match\` over mixed inputs using two or three pattern kinds.`,
    answer: `**Target Audience:** Python developers who know \`if\`/\`elif\`, lists, dicts and classes and have never used \`match\`, plus anyone who wants the exact rules an interviewer probes.
**Difficulty:** Medium
**Python version:** \`match\` needs Python 3.10+. Behaviour and bytecode checked on CPython 3.11 (gotchas re-run on 3.13); both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Ideas come in plain language first. The words an interviewer expects you to use are tagged \`📌 Interview term:\` and defined on the spot; all of them are collected in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A post-office sorter does not read every letter. They look at the **shape** of each item: a small flat envelope goes in tray A; a box with a customs label goes to customs, and they note the country written on that label; a parcel marked "fragile" with a weight over 5 kg goes to the special desk; anything else goes to "unknown". They stop at the first rule that fits.

\`match\`/\`case\` is that sorter. Each \`case\` describes a shape — "a list of two things starting with \`go\`", "a dict with a \`type\` key equal to \`click\`", "a \`Point\` whose \`x\` is 0" — and while checking, it **copies parts out** ("the country", "the direction") into variables. A C-style \`switch\` only asks "is it equal to 3?"; \`match\` asks "does it *look like* this, and what are its pieces?". That is why the feature is called **structural pattern matching**, and why interviewers like it: it replaces chains of \`isinstance\`, \`len\` and \`in\` checks with one readable block.

## 2. The Basic Shape

~~~python
match subject:
    case pattern_1:
        ...
    case pattern_2 if condition:
        ...
    case _:
        ...
~~~

📌 **Interview term: Subject** — the expression after \`match\`. It is evaluated **once**.

📌 **Interview term: Pattern** — the thing after \`case\`. It is not an expression: \`case [a, b]:\` does not build a list, it describes "a sequence of length 2" and *binds* \`a\` and \`b\`.

📌 **Interview term: Binding / capture** — storing part of the subject in a name when a pattern matches. The names are ordinary variables in the surrounding scope and stay set after the \`match\`.

📌 **Interview term: Guard** — an \`if condition\` after a pattern. The case runs only if the pattern matches *and* the guard is true; otherwise Python moves on to the next case.

Cases are tried **top to bottom**, and **only the first** matching case runs — there is no fall-through and no \`break\`. If nothing matches, nothing happens: no exception.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 400" role="img" aria-label="The subject is tested against each case from top to bottom; the first case whose pattern and guard both succeed binds its names and runs, and if none succeed the match statement does nothing">
  <defs>
    <marker id="py24q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="220" height="50" rx="10"/>
  <text class="d-text" x="360" y="50" text-anchor="middle">match subject</text>
  <rect class="d-box" x="250" y="120" width="220" height="50" rx="8"/>
  <text class="d-text" x="360" y="150" text-anchor="middle">case pattern 1</text>
  <rect class="d-box" x="250" y="220" width="220" height="50" rx="8"/>
  <text class="d-text" x="360" y="250" text-anchor="middle">case pattern 2 if guard</text>
  <rect class="d-box-muted" x="250" y="320" width="220" height="50" rx="8"/>
  <text class="d-text" x="360" y="350" text-anchor="middle">no case matched</text>
  <rect class="d-box-accent" x="540" y="170" width="160" height="50" rx="8"/>
  <text class="d-text" x="620" y="200" text-anchor="middle">bind names, run</text>
  <rect class="d-box-muted" x="20" y="320" width="160" height="50" rx="8"/>
  <text class="d-text" x="100" y="350" text-anchor="middle">do nothing</text>
  <line class="d-edge" x1="360" y1="70" x2="360" y2="116" marker-end="url(#py24q2-arrow)"/>
  <line class="d-edge-dashed" x1="360" y1="170" x2="360" y2="216" marker-end="url(#py24q2-arrow)"/>
  <text class="d-sub" x="375" y="198">no</text>
  <line class="d-edge-dashed" x1="360" y1="270" x2="360" y2="316" marker-end="url(#py24q2-arrow)"/>
  <text class="d-sub" x="375" y="298">no</text>
  <line class="d-edge-accent" x1="470" y1="145" x2="536" y2="185" marker-end="url(#py24q2-arrow)"/>
  <line class="d-edge-accent" x1="470" y1="245" x2="536" y2="205" marker-end="url(#py24q2-arrow)"/>
  <line class="d-edge" x1="250" y1="345" x2="184" y2="345" marker-end="url(#py24q2-arrow)"/>
</svg>

Cases are tried in order and the first success wins; "no case matched" is not an error, which is why [exhaustiveness](/interview-question/how-do-you-enforce-match-case-exhaustiveness-in-python) has to be enforced by you or your type checker.

## 3. Every Pattern Kind

| Pattern | Example | Matches when | Binds |
| :--- | :--- | :--- | :--- |
| Literal | \`case 200:\` \`case "quit":\` \`case None:\` | subject \`== 200\`; \`None\`/\`True\`/\`False\` use \`is\` | nothing |
| Capture | \`case x:\` | always | \`x\` = subject |
| Wildcard | \`case _:\` | always | nothing |
| Value | \`case Color.RED:\` \`case http.HTTPStatus.OK:\` | subject \`==\` that dotted name | nothing |
| Sequence | \`case [a, b]:\` \`case ["drop", *items]:\` | a sequence (list, tuple, range...) but **not** \`str\`/\`bytes\`/\`bytearray\`, right length | each element, \`*rest\` as a list |
| Mapping | \`case {"type": "click", "x": x}:\` | a mapping with at least those keys; extra keys ignored | values, \`**rest\` as a dict |
| Class | \`case Point(x=0, y=y):\` \`case int(n):\` | \`isinstance(subject, Point)\` and the attribute sub-patterns match | sub-pattern names |
| OR | \`case 401 \\| 403:\` | any alternative matches (all must bind the same names) | as alternatives |
| AS | \`case [_, _] as pair:\` | the inner pattern matches | the whole matched value |

📌 **Interview term: Value pattern** — a pattern written as a *dotted* name (\`Color.RED\`, \`module.CONSTANT\`). Because it has a dot, Python looks the value up and compares with \`==\` instead of capturing.

📌 **Interview term: Class pattern** — \`ClassName(...)\`. It first does an \`isinstance\` check, then matches keyword sub-patterns against attributes (\`Point(x=0)\` reads \`subject.x\`). For built-ins like \`int\`, \`str\`, \`float\`, \`list\`, \`dict\` a single positional sub-pattern matches the subject itself, so \`case int(n):\` binds the integer.

📌 **Interview term: \`__match_args__\`** — a class attribute, a tuple of attribute names, that says how *positional* sub-patterns map to attributes. \`@dataclass\` generates it: Example 1 prints \`('x', 'y')\` for \`Point\`, so \`Point(0, 0)\` means \`Point(x=0, y=0)\`. A class without it accepts no positional sub-patterns; on our run that raised \`TypeError: Q() accepts 0 positional sub-patterns (1 given)\`.

Patterns nest freely: \`case Circle(Point(x=cx, y=cy), radius=r):\` checks a \`Circle\` whose first positional attribute is a \`Point\`, and binds three names at once.

## 4. Walking Through Example 1

\`describe(subject)\` is a dispatcher with one case per pattern kind, ordered carefully:

- \`case None:\` comes first, then \`case 0 | 1 | 2:\`, an OR of literals.
- \`case int(n) if n < 0:\` is a class pattern plus a guard; \`-7\` hits it.
- \`case int() | float() as num:\` — an OR of two class patterns with \`as\` binding the whole subject. \`3.5\` and \`10\` land here. Order matters: \`2\` never gets here because the earlier OR caught it.
- \`case str() as text if not text:\` catches the empty string, then \`case str(text):\` binds any other string.
- \`case ["go", direction]:\` matches only a 2-element sequence whose first item equals \`"go"\`.
- \`case ["drop", *items] if items:\` matches \`("drop", "key", "map")\` — a tuple works as well as a list — and \`*items\` is always a **list**. \`["drop"]\` fails the guard and falls to \`case _:\`.
- \`case {"type": "click", "x": x, "y": y}:\` matched a dict that also had \`"button"\`, because mapping patterns ignore extra keys. \`{"type": kind, **rest}\` then collects the remaining keys.
- The three class cases show positional (via \`__match_args__\`), keyword and nested patterns. \`Point(3, 4)\` matches none of them and reaches \`case _:\`, as does a \`set\`, which is not a sequence pattern target.

## 5. The Gotchas (Example 2)

**1. A bare name captures; it does not compare.** If you write \`case RED:\` hoping to compare with a module constant \`RED\`, Python treats \`RED\` as a new variable that matches *everything*. CPython catches the common case at compile time:

~~~text
SyntaxError: name capture 'RED' makes remaining patterns unreachable
~~~

Use a dotted name (\`Color.RED\`, \`constants.RED\`) or a guard (\`case x if x == RED:\`). The same error appears for \`case x | 1:\`, and \`case [x] | (y,):\` fails with \`SyntaxError: alternative patterns bind different names\`.

**2. Strings are not sequences here.** \`"ab"\`, \`b"ab"\` and \`bytearray\` never match \`[a, b]\`, even though they are sequences elsewhere in Python — otherwise every string pattern would accidentally match character lists. A \`range\` does match.

**3. Mapping patterns are partial.** \`{"id": user_id}\` matches \`{"id": 1, "admin": True}\`. Add \`**rest\` and check \`if not rest\` if you need an exact key set.

**4. Number literals use \`==\`, singletons use \`is\`.** \`True == 1\`, so \`case 1:\` matches \`True\` — and \`1.0\` too. \`case True:\` uses identity, so it does *not* match \`1\`. With \`case True:\` first, \`lit(1)\` returned \`one\` and \`lit(True)\` returned \`True\`; swap the order and \`True\` would be caught by \`case 1:\`. Likewise \`case int():\` matches \`True\`, because \`bool\` is a subclass of \`int\`.

**5. No match is a silent no-op.** \`result\` stays \`"unchanged"\`. There is no \`MatchError\` as in some other languages.

**6. Bindings can leak from a failed case.** In \`case (a, b) if a > b:\`, the names are bound *before* the guard runs. The guard failed, yet \`a\` was \`5\` afterwards on both 3.11 and 3.13. Do not rely on this; it is an implementation detail, but it explains surprising leftover variables.

## 6. What CPython Actually Runs

A pattern compiles to dedicated bytecode, not to a chain of \`==\` calls. \`dis\` of \`case [a, b]:\` on CPython 3.11:

~~~text
  2           4 MATCH_SEQUENCE
              6 POP_JUMP_FORWARD_IF_FALSE    12 (to 32)
              8 GET_LEN
             10 LOAD_CONST               0 (2)
             12 COMPARE_OP               2 (==)
             18 POP_JUMP_FORWARD_IF_FALSE     6 (to 32)
             20 UNPACK_SEQUENCE          2
             24 STORE_NAME               1 (a)
             26 STORE_NAME               2 (b)
~~~

📌 **Interview term: \`MATCH_SEQUENCE\` / \`MATCH_MAPPING\` / \`MATCH_CLASS\`** — the bytecode instructions that test "is this a sequence (and not a str)", "is this a mapping", and "isinstance plus attributes". The sequence check is a type-flag test, then the length check, then an ordinary unpack. That is why \`match\` is not slower than the equivalent \`isinstance\`/\`len\` chain, but also not a jump table: cases are still tried one by one.

## 7. Verified: Running the Code

Example 1 on python3.11 (identical in the page on Pyodide):

~~~text
None                                          -> nothing
2                                             -> small number 2
-7                                            -> negative int -7
3.5                                           -> number 3.5
10                                            -> number 10
''                                            -> empty string
'hi'                                          -> string 'hi'
['go', 'north']                               -> go north
('drop', 'key', 'map')                        -> drop 2 items: ['key', 'map']
['drop']                                      -> unknown list
{'type': 'click', 'x': 1, 'y': 2, 'button': 'left'} -> click at 1,2
{'type': 'scroll', 'dy': 3, 'dx': 0}          -> event scroll with ['dx', 'dy']
Point(x=0, y=0)                               -> origin
Point(x=0, y=5)                               -> on the y axis at 5
Circle(center=Point(x=1, y=2), radius=9)      -> circle at 1,2 r=9
Point(x=3, y=4)                               -> unknown Point
{1, 2}                                        -> unknown set
('x', 'y')
~~~

Example 2:

~~~text
SyntaxError: name capture 'RED' makes remaining patterns unreachable
the RED member | captured 'red'
not a sequence pattern match | not a sequence pattern match | pair 'a','b' | pair 0,1
matched id 1 and ignored admin
one one True
True matched case 1 because True == 1
unchanged
after failed guard, a = 5
~~~

## 8. match vs if/elif vs a dict of handlers

| Need | Best tool | Why |
| :--- | :--- | :--- |
| Pick a handler by one exact value (\`"start"\`, \`"stop"\`) | dict \`{"start": start, ...}\` | O(1) lookup, easy to extend at runtime |
| A few unrelated conditions | \`if\`/\`elif\` | Simplest, no pattern rules to remember |
| Data of different shapes (tagged dicts, tuples, ASTs, events) | \`match\` | Checks the shape and pulls out the pieces in one step |
| A closed set of types where every case must be handled | \`match\` + \`assert_never\` | Type checkers can verify the [match is exhaustive](/interview-question/how-does-typing-never-enable-exhaustive-match-checking) |

## Common Pitfalls

- **Capturing instead of comparing.** \`case RED:\` binds a new variable; use \`Color.RED\` or a guard. Enums are the natural fit — see the [enum module](/interview-question/what-is-the-enum-module-and-when-should-you-use-it).
- **Putting a broad case first.** \`case int():\` before \`case 0:\` makes the zero case dead; order cases from specific to general.
- **Expecting a string to match \`[first, *rest]\`.** It never does; use \`case str() as s:\` and slice.
- **Forgetting mapping patterns ignore extra keys.** Validate with \`**rest\` if extra keys matter.
- **Matching \`True\` with \`case 1:\`.** Put \`case True:\`/\`case False:\` before number literals, or the bool gets swallowed.
- **Assuming a missing case raises.** It is a silent no-op; add \`case _:\` that raises, or \`assert_never\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">match</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case</code> (Python 3.10, PEPs 634-636) checks the <em style="color:#f0e2c8;">shape</em> of a value and binds its parts to names. Cases run top to bottom, first match wins, no fall-through.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pattern kinds:</strong> <span style="color:#f0e2c8;">Literal, capture, wildcard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_</code>, dotted value, sequence with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">*rest</code>, mapping with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">**rest</code>, class patterns like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point(x=0)</code>, OR <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code>, AS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">as</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code> guards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Classes:</strong> <span style="color:#f0e2c8;">A class pattern is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code> check plus attribute sub-patterns; positional ones go through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__match_args__</code>, which <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@dataclass</code> generates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The big gotcha:</strong> <span style="color:#f0e2c8;">A bare name captures: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case RED:</code> matches everything. Constants must be dotted, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Color.RED</code>. CPython rejects a capture-all case that is not last.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Other rules:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> never matches a sequence pattern, mapping patterns ignore extra keys, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case 1:</code> matches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>, and no matching case silently does nothing.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">match</code> faster than <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if</code>/<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">elif</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not fundamentally. It compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MATCH_SEQUENCE</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MATCH_MAPPING</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MATCH_CLASS</code> bytecode but cases are still tried one by one; use a dict for a pure value lookup.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">case Point(1, 2):</code> know which attributes to use?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point.__match_args__</code>, a tuple of attribute names. Dataclasses and named tuples generate it; without it only keyword sub-patterns like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Point(x=1)</code> work.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if no case matches?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Nothing — no exception. If every value must be handled, end with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case _:</code> that raises, or call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_never</code> so a type checker verifies exhaustiveness.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">case "ab":</code> not conflict with sequence patterns?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Literal string patterns compare with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>. Sequence patterns deliberately exclude <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytearray</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case [a, b]:</code> never splits a string.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you match a value stored in a local variable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by its bare name, which would capture. Use a guard, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case x if x == expected:</code>, or put the constant in a namespace and write it dotted.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Subject | The expression after \`match\`, evaluated once |
| Pattern | The shape description after \`case\`; not an expression |
| Binding / capture | Storing part of the subject in a name when a pattern matches |
| Guard | An \`if\` condition after a pattern that must also be true |
| Value pattern | A dotted name such as \`Color.RED\`, compared with \`==\` |
| Class pattern | \`Cls(...)\`: an \`isinstance\` check plus attribute sub-patterns |
| \`__match_args__\` | Tuple of attribute names used for positional sub-patterns |
| \`MATCH_SEQUENCE\` / \`MATCH_MAPPING\` / \`MATCH_CLASS\` | The bytecode instructions that implement the structural checks |

**Conclusion:** Structural pattern matching, added in Python 3.10 by [PEP 634](https://peps.python.org/pep-0634/) (with PEP 635 as rationale and PEP 636 as tutorial), is a way to test the shape of data and pull it apart in the same step: literals, captures, sequences, mappings, class patterns, OR, AS and guards, tried in order with the first match winning. Its sharp edges are few but real — bare names capture, strings are not sequences, extra mapping keys are ignored, \`True\` matches \`case 1:\`, and a missing case is silent — and knowing them is what separates "I have seen \`match\`" from "I can use it safely".`,
    examples: [
      {
        label: `Every pattern kind in one dispatcher`,
        code: `from dataclasses import dataclass


@dataclass
class Point:
    x: int
    y: int


@dataclass
class Circle:
    center: Point
    radius: int


def describe(subject):
    match subject:
        case None:                                  # literal (None/True/False use "is")
            return "nothing"
        case 0 | 1 | 2:                             # OR pattern of literals
            return f"small number {subject}"
        case int(n) if n < 0:                       # class pattern + guard
            return f"negative int {n}"
        case int() | float() as num:                # OR + AS: bind the whole subject
            return f"number {num}"
        case str() as text if not text:
            return "empty string"
        case str(text):
            return f"string {text!r}"
        case ["go", direction]:                     # sequence: exact length 2
            return f"go {direction}"
        case ["drop", *items] if items:             # star captures the rest
            return f"drop {len(items)} items: {items}"
        case {"type": "click", "x": x, "y": y}:     # mapping: these keys, extra ok
            return f"click at {x},{y}"
        case {"type": kind, **rest}:                # **rest collects the other keys
            return f"event {kind} with {sorted(rest)}"
        case Point(0, 0):                           # positional, via __match_args__
            return "origin"
        case Point(x=0, y=y):                       # keyword sub-patterns
            return f"on the y axis at {y}"
        case Circle(Point(x=cx, y=cy), radius=r):   # patterns nest
            return f"circle at {cx},{cy} r={r}"
        case _:                                     # wildcard: matches, binds nothing
            return f"unknown {type(subject).__name__}"


tests = [None, 2, -7, 3.5, 10, "", "hi", ["go", "north"], ("drop", "key", "map"),
         ["drop"], {"type": "click", "x": 1, "y": 2, "button": "left"},
         {"type": "scroll", "dy": 3, "dx": 0}, Point(0, 0), Point(0, 5),
         Circle(Point(1, 2), 9), Point(3, 4), {1, 2}]
for t in tests:
    print(f"{t!r:<45} -> {describe(t)}")

print(Point.__match_args__)  # ('x', 'y')`,
      },
      {
        label: `Six gotchas: capture vs constant, str sequences, extra keys, True vs 1`,
        code: `from enum import Enum


class Color(Enum):
    RED = "red"
    GREEN = "green"


RED = "red"

# Gotcha 1: a bare name is a CAPTURE pattern, not a constant lookup.
# Python refuses a bare-name case that is not last, because it would
# swallow everything after it:
try:
    compile("match c:\\n    case RED:\\n        pass\\n    case _:\\n        pass\\n", "demo", "exec")
except SyntaxError as e:
    print("SyntaxError:", e.msg)


def which(c):
    match c:
        case Color.RED:          # dotted name: compared with ==
            return "the RED member"
        case Color.GREEN:
            return "the GREEN member"
        case other:              # bare name: binds anything
            return f"captured {other!r}"


print(which(Color.RED), "|", which("red"))

# Gotcha 2: str, bytes and bytearray never match a sequence pattern.
def shape(x):
    match x:
        case [a, b]:
            return f"pair {a!r},{b!r}"
        case _:
            return "not a sequence pattern match"


print(shape("ab"), "|", shape(b"ab"), "|", shape(("a", "b")), "|", shape(range(2)))

# Gotcha 3: a mapping pattern ignores extra keys.
match {"id": 1, "admin": True}:
    case {"id": user_id}:
        print("matched id", user_id, "and ignored admin")

# Gotcha 4: number literals compare with ==, so True matches case 1;
# True, False and None compare with "is".
def lit(v):
    match v:
        case True:
            return "True"
        case 1:
            return "one"
        case _:
            return "other"


print(lit(1), lit(1.0), lit(True))
match True:
    case 1:
        print("True matched case 1 because True == 1")

# Gotcha 5: no matching case is not an error: the match does nothing.
result = "unchanged"
match 42:
    case 1:
        result = "one"
print(result)  # unchanged

# Gotcha 6: names bound before a failing guard can stay bound.
match (5, 6):
    case (a, b) if a > b:
        pass
    case _:
        pass
print("after failed guard, a =", a)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How do you enforce match/case exhaustiveness in Python?`,
    difficulty: "medium",
    seoDescription: `Python never checks match/case exhaustiveness at runtime. Enforce it with assert_never, mypy exhaustive-match, pyright strict and member-walking tests.`,
    description: `**Question presented to candidate:**
"You have a \`match\` over an order-status enum. Next month someone adds a new status. How do you make sure every \`match\` that should handle it gets flagged, instead of silently doing nothing?"

**What a strong answer should cover:**
- Python does not check exhaustiveness at runtime: when no case matches, the \`match\` does nothing and a function falls off the end returning \`None\`.
- The runtime safety net: a final \`case _:\` that raises; \`typing.assert_never(x)\` (3.11+) does that and also raises \`AssertionError\` even under \`python -O\`.
- The static check: with \`assert_never(x)\` in the default branch, mypy and pyright narrow \`x\` case by case and report the leftover type (for example \`Literal[Status.REFUNDED]\`) when a case is missing.
- Checkers can also flag a missing case without \`assert_never\`: mypy's opt-in \`--enable-error-code exhaustive-match\` (mypy 1.17+) and pyright's \`reportMatchNotExhaustive\` (on in strict mode).
- It only works over closed types: enums, \`Literal[...]\`, \`bool\`, and unions of classes. A bare \`object\`, \`str\` or \`int\` can never be exhausted.
- A test that iterates \`Enum\` members or \`typing.get_args(Union)\` catches gaps in projects without a checker in CI.

**Clarifying questions expected:**
- Does the project run mypy or pyright in CI, and in which mode?
- Is the value a closed set (enum, Literal, union of classes), or arbitrary input that needs a real default?

**Code / implementation expected:** Yes — a \`match\` ending in \`case _: assert_never(x)\` plus the checker error it produces.`,
    answer: `**Target Audience:** Python developers who use \`match\` or \`if\`/\`elif\` chains over enums or tagged types and want missing cases caught automatically.
**Difficulty:** Medium
**Python version:** \`assert_never\` needs Python 3.11+ (or \`typing_extensions\`). Runtime behaviour checked on CPython 3.11; both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3). Checker output is from mypy 2.3.1 and pyright 1.1.414.

> **How to read this doc:** Ideas come in plain language first. Terms an interviewer expects are tagged \`📌 Interview term:\` and defined on the spot; all of them are collected in the Quick Glossary at the end. Every output shown — Python and type checker — was printed by a real run.

## 1. Why This Even Matters — A Story First

A hotel has a checklist for every room type: single, double, suite. Each night the night manager walks the list. One day the owner adds a fourth type, "family room" — but nobody updates the checklist. Nothing breaks. No alarm sounds. Family rooms are simply never cleaned, and you find out from an angry review.

A \`match\` over an enum is that checklist. Add \`Status.REFUNDED\`, forget one \`match\`, and Python does **nothing** for refunded orders: no error, just a \`None\` or a skipped side effect. "Exhaustive" means "every possible value has a case". Interviewers ask this because it is a real production bug class, and the answer shows whether you know the difference between what Python checks (nothing) and what your tools can check (a lot).

📌 **Interview term: Exhaustive match** — a \`match\` (or \`if\`/\`elif\` chain) that has a case for every value the subject can have, so no value can fall through unhandled.

## 2. Python Itself Checks Nothing

Example 1, version 1, has no default case. Calling it with the forgotten member returns \`None\`:

~~~python
def label_silent(s: Status):
    match s:
        case Status.PENDING:
            return "Waiting for payment"
        case Status.PAID:
            return "Paid"

print(repr(label_silent(Status.REFUNDED)))  # None
~~~

Unlike Rust or Scala, Python has no "match error". The [pattern matching question](/interview-question/what-is-structural-pattern-matching-match-case) shows the same: no matching case is a silent no-op.

## 3. Layer 1 — Fail Loudly at Runtime

The cheapest fix is a final default that raises:

~~~python
case _:
    raise ValueError(f"unhandled status: {s!r}")
~~~

Better is \`assert_never\`, from \`typing\` since Python 3.11 (\`typing_extensions\` before; see the [typing guide on exhaustiveness](https://typing.python.org/en/latest/guides/unreachable.html)):

~~~python
case _:
    assert_never(s)
~~~

📌 **Interview term: \`typing.assert_never(arg)\`** — a function annotated \`(arg: Never, /) -> Never\`. At runtime it raises \`AssertionError("Expected code to be unreachable, but got: ...")\`, with the repr cut to 100 characters plus \`...\`. It is a normal function call, not an \`assert\` statement, so \`python -O\` does **not** remove it — on our run it still raised under \`-O\`, while a plain \`assert False\` was skipped.

The extra value over \`raise ValueError\` is the second layer.

## 4. Layer 2 — Let the Type Checker Find the Gap

A type checker *narrows* the subject: after \`case Status.PENDING:\` it knows that value is handled, after \`case Status.PAID:\` that one too, so in \`case _:\` only \`Status.REFUNDED\` is left. \`assert_never\` accepts only the type \`Never\` (no possible value), so passing a leftover member is a type error. How \`Never\` makes that work is the subject of [typing.Never and exhaustive checking](/interview-question/how-does-typing-never-enable-exhaustive-match-checking).

📌 **Interview term: Type narrowing** — the checker's ability to give a variable a more precise type inside a branch (after \`isinstance\`, \`==\` against a literal, or a \`case\`) than the declared one.

Here is a file with three styles of the same function:

~~~python
from enum import Enum
from typing import assert_never


class Status(Enum):
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"


def notify(s: Status) -> None:          # returns nothing: no "missing return" hint
    match s:
        case Status.PENDING:
            print("remind")
        case Status.PAID:
            print("thank")


def label(s: Status) -> str:            # returns str: missing return is reported
    match s:
        case Status.PENDING:
            return "Waiting"
        case Status.PAID:
            return "Paid"


def label_checked(s: Status) -> str:    # assert_never names the missing member
    match s:
        case Status.PENDING:
            return "Waiting"
        case Status.PAID:
            return "Paid"
        case _:
            assert_never(s)
~~~

Plain \`mypy q3_check.py\`:

~~~text
q3_check.py:19: error: Missing return statement  [return]
q3_check.py:34: error: Argument 1 to "assert_never" has incompatible type "Literal[Status.REFUNDED]"; expected "Never"  [arg-type]
Found 2 errors in 1 file (checked 1 source file)
~~~

Two things to see. \`label_checked\` gets a precise error naming the missing member. \`label\` (returns \`str\`, no \`assert_never\`) gets only a vague "Missing return statement" — useful, but it does not name the case. And \`notify\` (returns \`None\`, no default) is **not reported at all**, because falling off the end of a \`-> None\` function is legal.

### Opt-in "non-exhaustive match" errors

Both checkers can also report the missing case directly, without \`assert_never\`. mypy 1.17 added the opt-in error code \`exhaustive-match\` (per the mypy 1.17 release notes; a [later issue](https://github.com/python/mypy/issues/19791) reports a false positive with untyped decorators, so keep your mypy current). With \`mypy --enable-error-code exhaustive-match q3_check.py\`:

~~~text
q3_check.py:12: error: Match statement has unhandled case for values of type "Literal[Status.REFUNDED]"  [exhaustive-match]
q3_check.py:12: note: If match statement is intended to be non-exhaustive, add \`case _: pass\`
q3_check.py:19: error: Missing return statement  [return]
q3_check.py:20: error: Match statement has unhandled case for values of type "Literal[Status.REFUNDED]"  [exhaustive-match]
q3_check.py:20: note: If match statement is intended to be non-exhaustive, add \`case _: pass\`
q3_check.py:34: error: Argument 1 to "assert_never" has incompatible type "Literal[Status.REFUNDED]"; expected "Never"  [arg-type]
Found 4 errors in 1 file (checked 1 source file)
~~~

pyright has the rule \`reportMatchNotExhaustive\`. On pyright 1.1.414 it was **off** in the default mode and **on** in strict mode. Default mode:

~~~text
  q3_check.py:19:25 - error: Function with declared return type "str" must return value on all code paths
    "None" is not assignable to "str" (reportReturnType)
  q3_check.py:34:26 - error: Argument of type "Literal[Status.REFUNDED]" cannot be assigned to parameter "arg" of type "Never" in function "assert_never"
    Type "Literal[Status.REFUNDED]" is not assignable to type "Never" (reportArgumentType)
2 errors, 0 warnings, 0 informations
~~~

With \`{"typeCheckingMode": "strict"}\` in \`pyrightconfig.json\`:

~~~text
  q3_check.py:12:11 - error: Cases within match statement do not exhaustively handle all values
    Unhandled type: "Literal[Status.REFUNDED]"
    If exhaustive handling is not intended, add "case _: pass" (reportMatchNotExhaustive)
  q3_check.py:19:25 - error: Function with declared return type "str" must return value on all code paths
    "None" is not assignable to "str" (reportReturnType)
  q3_check.py:20:11 - error: Cases within match statement do not exhaustively handle all values
    Unhandled type: "Literal[Status.REFUNDED]"
    If exhaustive handling is not intended, add "case _: pass" (reportMatchNotExhaustive)
  q3_check.py:34:26 - error: Argument of type "Literal[Status.REFUNDED]" cannot be assigned to parameter "arg" of type "Never" in function "assert_never"
    Type "Literal[Status.REFUNDED]" is not assignable to type "Never" (reportArgumentType)
4 errors, 0 warnings, 0 informations
~~~

You can also turn it on alone with \`reportMatchNotExhaustive = true\` under \`[tool.pyright]\` in \`pyproject.toml\`, or per file with a \`# pyright: reportMatchNotExhaustive=true\` comment (we checked the comment form on our run). Both flags say "add \`case _: pass\`" for a match that is *meant* to be partial.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 230" role="img" aria-label="Three layers of defence: the type checker in the editor and CI, a test that walks every member, and assert_never raising at runtime">
  <defs>
    <marker id="py24q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="115" y="85" text-anchor="middle">type checker</text>
  <text class="d-sub" x="115" y="115" text-anchor="middle">editor and CI</text>
  <text class="d-sub" x="115" y="138" text-anchor="middle">before code runs</text>
  <rect class="d-box" x="265" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="360" y="85" text-anchor="middle">member test</text>
  <text class="d-sub" x="360" y="115" text-anchor="middle">loop over the enum</text>
  <text class="d-sub" x="360" y="138" text-anchor="middle">in the test suite</text>
  <rect class="d-box-muted" x="510" y="40" width="190" height="120" rx="10"/>
  <text class="d-text" x="605" y="85" text-anchor="middle">assert_never</text>
  <text class="d-sub" x="605" y="115" text-anchor="middle">raises at runtime</text>
  <text class="d-sub" x="605" y="138" text-anchor="middle">last line of defence</text>
  <line class="d-edge" x1="210" y1="100" x2="261" y2="100" marker-end="url(#py24q3-arrow)"/>
  <line class="d-edge" x1="455" y1="100" x2="506" y2="100" marker-end="url(#py24q3-arrow)"/>
</svg>

The earlier the layer, the cheaper the bug: a checker error costs seconds, a failing test minutes, a runtime \`AssertionError\` an incident.

## 5. Layer 3 — A Test That Walks Every Case

Not every project runs a checker in CI. Example 1, version 4, iterates the enum and records every member whose handler returns \`None\` or raises: \`missing_cases(label_silent, Status)\` printed \`['REFUNDED']\`. Example 2 does the same for a union of dataclasses with \`typing.get_args(Payment)\`, which returns the classes, and for \`Literal["eu", "us"]\`, whose \`get_args\` is \`('eu', 'us')\`. The type alias is then the single source of truth for both the checker and the test.

## 6. What Can Be Exhausted

| Subject type | Exhaustible? | What the cases look like |
| :--- | :--- | :--- |
| \`Enum\` subclass | Yes | \`case Status.PAID:\` one per member (or \`Status.A \\| Status.B\`) |
| \`Literal["eu", "us"]\` | Yes | \`case "eu":\` one per literal |
| \`bool\` | Yes | \`case True:\` and \`case False:\` |
| \`Circle \\| Square\` (union of classes) | Yes | \`case Circle():\` one class pattern per member |
| \`int\`, \`str\`, \`object\` | No | infinite values: a real \`case _:\` default is required |
| \`Optional[X]\` | Yes | add \`case None:\` |

Python has no \`sealed\` keyword: a subclass added elsewhere is not part of \`Payment\` unless someone adds it to the union, which is why the union alias, not the base class, is what you match against. Example 2 shows that a \`Crypto\` payment outside the union reaches \`assert_never\` at runtime. It also shows the opposite mistake: \`case object():\` first makes every later case dead code, and \`broad(Card("1111"))\` printed \`anything\`.

## 7. Verified: Running the Code

Example 1 on python3.11 (identical in the page on Pyodide):

~~~text
None
ValueError: unhandled status: <Status.REFUNDED: 'refunded'>
AssertionError: Expected code to be unreachable, but got: <Status.REFUNDED: 'refunded'>
['REFUNDED']
['REFUNDED']
~~~

Example 2:

~~~text
['Card', 'BankTransfer', 'Voucher']
{'Card': 30, 'BankTransfer': 0, 'Voucher': 0}
('eu', 'us')
{'eu': 0.2, 'us': 0.0}
AssertionError: Expected code to be unreachable, but got: Crypto(wallet='0xabc')
anything
~~~

## 8. Comparing the Options

| Technique | Catches it when | Names the missing case | Needs |
| :--- | :--- | :--- | :--- |
| No default | Never | — | — |
| \`case _: raise ValueError(...)\` | At runtime, when the value arrives | At runtime only | Nothing |
| \`case _: assert_never(x)\` | In the checker **and** at runtime | Yes | Python 3.11+ or \`typing_extensions\` |
| Return-type "missing return" error | In the checker, only for non-\`None\` returns | No | Any checker |
| mypy \`--enable-error-code exhaustive-match\` | In the checker, every match | Yes | mypy 1.17+ |
| pyright \`reportMatchNotExhaustive\` | In the checker, every match | Yes | pyright strict mode or the setting |
| Member-walking test | In the test suite | Yes | A test per handler |

## Common Pitfalls

- **Relying on a \`-> None\` function to be reported.** Falling off the end is legal there; only \`assert_never\` or the opt-in flags catch it.
- **Using \`case _: pass\` by habit.** It silences both checker flags *and* hides new members; use it only when the match is meant to be partial.
- **Matching against an open type.** \`match status_code:\` on an \`int\` can never be exhaustive; checkers will rightly flag \`assert_never(code)\`.
- **Writing \`assert False\` instead of \`assert_never\`.** It does not name the missing type in the checker, and \`python -O\` removes it.
- **Catch-all patterns early.** \`case object():\` or a bare-name capture before the specific cases makes them unreachable.
- **Forgetting the union alias.** Adding a new dataclass without adding it to \`Payment\` means the checker never asks for its case.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The fact:</strong> <span style="color:#f0e2c8;">Python never checks exhaustiveness: if no case matches, the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">match</code> does nothing and the function returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Runtime net:</strong> <span style="color:#f0e2c8;">End with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case _: assert_never(x)</code>. It raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AssertionError</code> naming the value, and unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert</code> it survives <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python -O</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Static check:</strong> <span style="color:#f0e2c8;">mypy and pyright narrow the subject case by case; in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case _</code> the leftover type must be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Never</code>, so a missing member becomes an error naming it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Without assert_never:</strong> <span style="color:#f0e2c8;">Turn on mypy's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exhaustive-match</code> error code (1.17+) or pyright's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reportMatchNotExhaustive</code> (on in strict mode).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scope:</strong> <span style="color:#f0e2c8;">It works only for closed types: enums, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Literal</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bool</code>, unions of classes. For <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> you need a real default. Add a member-walking test if CI has no checker.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">case _: raise ValueError</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It fails only when the bad value arrives in production. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_never</code> raises the same way at runtime but also makes the checker report the gap before the code ships.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the checker not complain about my <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">-&gt; None</code> handler?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Falling off the end of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt; None</code> function is valid, so there is no missing-return error. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_never</code> or the opt-in exhaustive-match flags.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this work for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">if</code>/<code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">elif</code> chains too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Narrowing works for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> against literals and enum members and for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else: assert_never(x)</code> is checked the same way.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Python has no sealed classes — how do you make a closed hierarchy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Match against a union alias like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Payment = Card | BankTransfer | Voucher</code>. The alias is the closed list; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">typing.get_args(Payment)</code> also feeds a runtime test.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">case _: pass</code> do to the checks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It declares the match intentionally partial: both mypy and pyright stop reporting it, and new members are silently ignored.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Exhaustive match | A match with a case for every possible value of the subject |
| \`typing.assert_never(arg)\` | Takes only \`Never\`; the checker errors if reachable, and at runtime it raises \`AssertionError\` |
| Type narrowing | The checker giving a variable a more precise type inside a branch |

**Conclusion:** Python will never tell you that a \`match\` missed a case — it just does nothing. Exhaustiveness is enforced in layers you add: \`case _: assert_never(x)\` turns a silent miss into a runtime \`AssertionError\` and, more importantly, into a type-checker error that names the forgotten member; mypy's \`exhaustive-match\` code and pyright's \`reportMatchNotExhaustive\` flag missing cases even without it; and a test that walks the enum or union members covers projects without a checker. All of it depends on matching over a closed type — an enum, a \`Literal\`, or a union of classes.`,
    examples: [
      {
        label: `Silent miss, loud default, assert_never and a test that walks the enum`,
        code: `from enum import Enum
from typing import assert_never


class Status(Enum):
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"     # added later by a teammate


# Version 1: no default case. A missing case is silent at runtime.
def label_silent(s: Status):
    match s:
        case Status.PENDING:
            return "Waiting for payment"
        case Status.PAID:
            return "Paid"


print(repr(label_silent(Status.REFUNDED)))  # None


# Version 2: fail loudly with an explicit default.
def label_loud(s: Status) -> str:
    match s:
        case Status.PENDING:
            return "Waiting for payment"
        case Status.PAID:
            return "Paid"
        case _:
            raise ValueError(f"unhandled status: {s!r}")


try:
    label_loud(Status.REFUNDED)
except ValueError as e:
    print("ValueError:", e)


# Version 3: assert_never. Same loud failure at runtime, and a type
# checker reports the missing case before the code ever runs.
def label_checked(s: Status) -> str:
    match s:
        case Status.PENDING:
            return "Waiting for payment"
        case Status.PAID:
            return "Paid"
        case _:
            assert_never(s)


try:
    label_checked(Status.REFUNDED)
except AssertionError as e:
    print("AssertionError:", e)


# Version 4: a test that walks every member, so CI catches the gap
# even in a project that runs no type checker.
def missing_cases(func, enum_cls):
    missing = []
    for member in enum_cls:
        try:
            if func(member) is None:
                missing.append(member.name)
        except (AssertionError, ValueError):
            missing.append(member.name)
    return missing


print(missing_cases(label_silent, Status))   # ['REFUNDED']
print(missing_cases(label_checked, Status))  # ['REFUNDED']`,
      },
      {
        label: `Exhaustive matching over a union of dataclasses and a Literal`,
        code: `from dataclasses import dataclass
from typing import Literal, Union, assert_never, get_args


@dataclass(frozen=True)
class Card:
    last4: str


@dataclass(frozen=True)
class BankTransfer:
    iban: str


@dataclass(frozen=True)
class Voucher:
    code: str


# A closed set of variants: the union IS the list a checker verifies against.
Payment = Union[Card, BankTransfer, Voucher]


def fee_cents(p: Payment) -> int:
    match p:
        case Card(last4=last4):
            return 30
        case BankTransfer():
            return 0
        case Voucher():
            return 0
        case _:
            assert_never(p)


Region = Literal["eu", "us"]


def vat_rate(r: Region) -> float:
    match r:
        case "eu":
            return 0.2
        case "us":
            return 0.0
        case _:
            assert_never(r)


# get_args() turns the same type aliases into runtime lists, so one test
# can check that every variant is handled.
samples = {Card: Card("4242"), BankTransfer: BankTransfer("DE00"), Voucher: Voucher("FREE")}
print([cls.__name__ for cls in get_args(Payment)])
print({cls.__name__: fee_cents(samples[cls]) for cls in get_args(Payment)})
print(get_args(Region))  # ('eu', 'us')
print({r: vat_rate(r) for r in get_args(Region)})


# A variant that is not in the union reaches the assert_never branch.
@dataclass(frozen=True)
class Crypto:
    wallet: str


try:
    fee_cents(Crypto("0xabc"))
except AssertionError as e:
    print("AssertionError:", e)

# Order matters: a broad pattern first makes later cases dead code.
def broad(p: Payment) -> str:
    match p:
        case object():
            return "anything"
        case Card():
            return "never reached"
    return "unreachable"


print(broad(Card("1111")))  # anything`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does typing.Never enable exhaustive match checking?`,
    difficulty: "hard",
    seoDescription: `typing.Never is the bottom type: no value has it. Narrowing leaves Never after every case, so assert_never(x) type-checks only when a match is exhaustive.`,
    description: `**Question presented to candidate:**
"\`typing.assert_never\` takes a parameter of type \`Never\`. What is \`Never\`, and why does annotating that one parameter let a type checker prove a \`match\` statement covers every case?"

**What a strong answer should cover:**
- \`Never\` is the *bottom type*: the type with no values. A function returning \`Never\` never returns normally (it raises, exits or loops forever); a parameter of type \`Never\` can accept no argument.
- \`Never\` was added in Python 3.11 (\`typing_extensions\` before); \`NoReturn\` is older and checkers treat the two as the same type. At runtime they are distinct special forms that cannot be instantiated or used with \`isinstance\`.
- Narrowing: the checker subtracts each handled type from the subject's declared union; once everything is handled, the remaining type is \`Never\` and that branch is unreachable.
- \`assert_never(arg: Never) -> Never\` turns "the leftover type is not \`Never\`" into an argument-type error that names exactly the unhandled type; when the match is exhaustive the call is fine (and mypy does not flag it as unreachable).
- Because a call returning \`Never\` ends the path, code after it is unreachable and functions like \`fail()\` or \`sys.exit()\` satisfy any declared return type.

**Code / implementation expected:** Yes — a \`match\` over a union ending in \`case _: assert_never(x)\`, and the checker output with and without the missing case.`,
    answer: `**Target Audience:** Python developers who have seen \`assert_never\` in a \`match\` and want to understand the type theory behind it well enough to explain it.
**Difficulty:** Hard
**Python version:** \`typing.Never\` and \`typing.assert_never\` need Python 3.11+. Runtime behaviour checked on CPython 3.11 and 3.13; both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3). Checker output is from mypy 2.3.1 and pyright 1.1.414.

> **How to read this doc:** Ideas come in plain language first. Terms an interviewer expects are tagged \`📌 Interview term:\` and defined on the spot; all of them are collected in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

A security guard at a party has a guest list: Circle, Square and Triangle. As each guest arrives, the guard ticks them off. At the end of the night the guard looks at the list of **people still expected**. If it is empty, everyone is accounted for. If it says "Triangle", somebody is missing.

Now imagine a special chair at the door with a sign: "Only for a guest who is **not on any list at all**." No such guest exists, so the chair must stay empty. If anyone is still expected when the doors close, they would have to sit in that chair — which is impossible, so the guard raises an alarm.

That chair is a parameter of type \`Never\`. The guest list is a union type; ticking off guests is *narrowing*; and \`assert_never(x)\` is "put whoever is still expected in the special chair". If the match covered everyone, nobody needs the chair and the code is fine. If a case is missing, the checker says *exactly who* is still expected. This is the mechanism behind [enforcing match/case exhaustiveness](/interview-question/how-do-you-enforce-match-case-exhaustiveness-in-python), and interviewers use it to see whether you understand types as sets of values.

## 2. Types as Sets of Values

Think of a type as the set of values it allows:

- \`bool\` is \`{True, False}\`.
- \`Literal["r", "w"]\` is \`{"r", "w"}\`.
- \`Circle | Square\` is "every Circle plus every Square".
- \`object\` is every value — the **top** type.
- \`Never\` is the **empty set**: no value at all — the **bottom** type.

📌 **Interview term: Bottom type (\`Never\`)** — the type with no values. Nothing can be assigned to it, and it can be assigned to every other type (an empty set is a subset of every set). The [typing guide](https://typing.python.org/en/latest/guides/unreachable.html) and CPython changelog date \`typing.Never\` and \`typing.assert_never\` to Python 3.11; older code imports them from \`typing_extensions\` (4.1+).

📌 **Interview term: \`NoReturn\`** — the older spelling (in \`typing\` since 3.6.2), originally meant only for return types. Checkers treat \`Never\` and \`NoReturn\` as the same type: assigning \`stop: () -> NoReturn\` to a \`Callable[[], Never]\` and the reverse produced no errors on mypy or pyright in our check. At runtime they are different objects (\`Never is NoReturn\` printed \`False\`). Convention: \`Never\` reads better for parameters and narrowed types, \`NoReturn\` is still common on return types.

At runtime, \`Never\` is just a marker. Example 1 prints that it is a \`_SpecialForm\`, that \`Never()\` raises \`TypeError: Cannot instantiate typing.Never\`, and that \`isinstance(1, Never)\` is a \`TypeError\` too.

## 3. Two Jobs for Never

**As a return type** — "this function never returns normally":

~~~python
def fail(message: str) -> Never:
    raise RuntimeError(message)
~~~

Because the call never returns, the checker treats everything after \`fail(...)\` as unreachable. That is why \`parse_port\` in Example 2 can end with \`fail(...)\` and still satisfy \`-> int\` without a final \`return\`, and why \`return fail("impossible")\` type-checks inside a function returning \`str\`: a \`Never\` value fits any type. \`sys.exit\` is the standard-library classic.

**As a parameter type** — "no argument is acceptable". You cannot call \`takes_never(1)\`: our mypy run said \`Argument 1 to "takes_never" has incompatible type "int"; expected "Never"\`. A function nobody can call sounds useless — until you call it in a place where the argument's type has been narrowed down to nothing. That is \`assert_never\`:

~~~text
{'arg': typing.Never, 'return': typing.Never}
~~~

(That is \`get_type_hints(assert_never)\` from Example 1: \`def assert_never(arg: Never, /) -> Never\`.)

## 4. Narrowing Down to Never

📌 **Interview term: Type narrowing** — inside a branch, the checker uses the condition (\`isinstance\`, \`==\` against a literal or enum member, \`is None\`, a \`case\` pattern) to give a variable a smaller type than its declaration. In a \`match\`, each case subtracts what it matched from what is left for the following cases.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 210" role="img" aria-label="The declared type Circle or Square or Triangle shrinks after each case until nothing is left, which is the type Never">
  <defs>
    <marker id="py24q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="10" y="50" width="160" height="70" rx="10"/>
  <text class="d-text" x="90" y="80" text-anchor="middle">Circle | Square</text>
  <text class="d-text" x="90" y="102" text-anchor="middle">| Triangle</text>
  <rect class="d-box" x="210" y="50" width="160" height="70" rx="10"/>
  <text class="d-text" x="290" y="91" text-anchor="middle">Square | Triangle</text>
  <rect class="d-box" x="410" y="50" width="140" height="70" rx="10"/>
  <text class="d-text" x="480" y="91" text-anchor="middle">Triangle</text>
  <rect class="d-box-accent" x="600" y="50" width="140" height="70" rx="10"/>
  <text class="d-text" x="670" y="91" text-anchor="middle">Never</text>
  <line class="d-edge" x1="170" y1="85" x2="206" y2="85" marker-end="url(#py24q4-arrow)"/>
  <line class="d-edge" x1="370" y1="85" x2="406" y2="85" marker-end="url(#py24q4-arrow)"/>
  <line class="d-edge-accent" x1="550" y1="85" x2="596" y2="85" marker-end="url(#py24q4-arrow)"/>
  <text class="d-sub" x="188" y="160" text-anchor="middle">case Circle</text>
  <text class="d-sub" x="388" y="160" text-anchor="middle">case Square</text>
  <text class="d-sub" x="573" y="160" text-anchor="middle">case Triangle</text>
</svg>

After the last case the leftover type is \`Never\`: the \`case _:\` branch can receive no value, so a checker treats it as unreachable. Example 1 has a toy model of this subtraction that prints \`['Square | Triangle', 'Triangle', 'Never']\`, and, with the Triangle case removed, \`['Square | Triangle', 'Triangle']\` — something is still left.

## 5. Why assert_never Turns That Into an Error

Put the two ideas together. In \`case _:\` the subject has the leftover type. \`assert_never(subject)\` requires \`Never\`. So:

- **Exhaustive match** — leftover is \`Never\`, the call is valid, no error.
- **A case is missing** — leftover is, say, \`Triangle\`; passing a \`Triangle\` to a \`Never\` parameter is an ordinary argument-type error, and the message names the missing type.

A file with the Triangle case removed and \`reveal_type\` in each branch:

~~~python
import sys
from dataclasses import dataclass
from typing import Callable, Never, NoReturn, assert_never


@dataclass
class Circle:
    r: float


@dataclass
class Square:
    side: float


@dataclass
class Triangle:
    base: float
    height: float


def area(s: Circle | Square | Triangle) -> float:
    match s:
        case Circle(r=r):
            reveal_type(s)
            return 3.14 * r * r
        case Square(side=a):
            reveal_type(s)
            return a * a
        case _:
            reveal_type(s)
            assert_never(s)


def fail(msg: str) -> Never:
    raise RuntimeError(msg)


def stop() -> NoReturn:
    sys.exit(1)


handlers: list[Callable[[str], NoReturn]] = [fail]
also: Callable[[], Never] = stop


def parse(text: str) -> int:
    if text.isdigit():
        return int(text)
    fail("bad")


def wrong() -> int:
    fail("bad")
    return "not an int"
~~~

\`mypy --warn-unreachable q4_check.py\`:

~~~text
q4_check.py:25: note: Revealed type is "q4_check.Circle"
q4_check.py:28: note: Revealed type is "q4_check.Square"
q4_check.py:31: note: Revealed type is "q4_check.Triangle"
q4_check.py:32: error: Argument 1 to "assert_never" has incompatible type "Triangle"; expected "Never"  [arg-type]
q4_check.py:55: error: Statement is unreachable  [unreachable]
Found 2 errors in 1 file (checked 1 source file)
~~~

pyright (file path shortened):

~~~text
  q4_check.py:25:25 - information: Type of "s" is "Circle"
  q4_check.py:28:25 - information: Type of "s" is "Square"
  q4_check.py:31:25 - information: Type of "s" is "Triangle"
  q4_check.py:32:26 - error: Argument of type "Triangle" cannot be assigned to parameter "arg" of type "Never" in function "assert_never"
    Type "Triangle" is not assignable to type "Never" (reportArgumentType)
1 error, 0 warnings, 3 informations
~~~

Read it top down. The revealed types are exactly the narrowing chain: \`Circle\`, then \`Square\`, then \`Triangle\` left over in \`case _\`, and the \`assert_never\` line reports it. No error appeared for the two \`handlers\` / \`also\` lines, which is the \`Never\`/\`NoReturn\` equivalence, and \`parse\` needs no final \`return\`. In \`wrong\`, mypy marked \`return "not an int"\` as unreachable *instead of* reporting a type error on it — unreachable code is not type-checked at all, which is worth knowing.

Now the fixed version, with all three cases and \`assert_never\` in \`case _\`:

~~~python
from typing import assert_never


class Circle: ...
class Square: ...
class Triangle: ...


def sides(s: Circle | Square | Triangle) -> int:
    match s:
        case Circle():
            return 0
        case Square():
            return 4
        case Triangle():
            return 3
        case _:
            assert_never(s)
~~~

\`mypy --strict --warn-unreachable\` printed \`Success: no issues found in 1 source file\` and pyright \`0 errors, 0 warnings, 0 informations\`. Note mypy's \`--warn-unreachable\` does not complain that the \`assert_never\` line itself is unreachable — it is exempt. When we put a \`reveal_type(s)\` before it in that branch, mypy reported \`Statement is unreachable\` for the \`reveal_type\` line and pyright printed nothing for it: neither checker evaluates expressions in a branch whose subject is \`Never\`, so you will rarely see the word "Never" in a reveal. The proof is the *absence* of an error on \`assert_never\`.

## 6. Walking Through the Examples

**Example 1** shows \`Never\` at runtime (special form, cannot instantiate, no \`isinstance\`), the \`Never is NoReturn\` runtime difference, the narrowing toy model, and a real \`sides()\` function with \`case _: assert_never(shape)\`. Called with valid shapes it returns \`[0, 4, 3]\`; called with \`"hexagon"\` at runtime — something a checker would reject — the guard still fires with \`AssertionError: Expected code to be unreachable, but got: 'hexagon'\`.

**Example 2** shows \`Never\` as a return type (\`fail\`, \`parse_port\`, \`sys.exit\`) and narrowing outside \`match\`: an \`if\`/\`elif\` chain over \`Literal["debug", "info", "error"]\` ending in \`else: assert_never(level)\`, and an \`isinstance\` chain that ends in \`return fail("impossible")\`.

## 7. Verified: Running the Code

Example 1 on python3.11 (identical in the page on Pyodide):

~~~text
typing.Never _SpecialForm
{'arg': typing.Never, 'return': typing.Never}
TypeError: Cannot instantiate typing.Never
TypeError: typing.Never cannot be used with isinstance()
False typing.NoReturn
['Square | Triangle', 'Triangle', 'Never']
['Square | Triangle', 'Triangle']
[0, 4, 3]
AssertionError: Expected code to be unreachable, but got: 'hexagon'
~~~

Example 2:

~~~text
8080
RuntimeError: not a port: 'http'
sys.exit raised SystemExit with code 3
['grey', 'blue', 'red']
int str
RuntimeError: impossible
~~~

## 8. Never Compared With Its Neighbours

| Type | Values | Typical use | Assignable to |
| :--- | :--- | :--- | :--- |
| \`object\` | every value (top) | "anything", must narrow before use | only \`object\` |
| \`Any\` | opt-out of checking | gradual typing, untyped code | everything, both ways |
| \`None\` | exactly \`None\` | "returns nothing useful" — the function *does* return | \`None\`, \`Optional[...]\` |
| \`Never\` / \`NoReturn\` | no values (bottom) | never returns; impossible branch; \`assert_never\` parameter | every type |

The classic confusion is \`-> None\` vs \`-> Never\`: \`None\` means "returns, with nothing useful"; \`Never\` means "does not return at all".

## Common Pitfalls

- **Annotating a function that can return as \`-> Never\`.** If any path returns normally, checkers report it (mypy: \`Implicit return in function which does not return\`; pyright: \`Function with declared return type "NoReturn" cannot return "None"\` — note it calls \`Never\` by its other name); and worse, callers treat the following code as unreachable and stop checking it.
- **Mixing up \`None\` and \`Never\`.** \`def log() -> None\` returns; \`def die() -> Never\` does not.
- **Expecting \`reveal_type\` to show \`Never\`.** In an exhaustive branch the checkers treat the code as unreachable and print nothing (pyright) or "Statement is unreachable" (mypy with \`--warn-unreachable\`).
- **Narrowing an open type.** \`int\` or \`str\` never narrow to \`Never\` through literal cases, so \`assert_never(code)\` on an \`int\` is always an error.
- **Hiding code behind a \`Never\` call.** Code after \`fail(...)\` is not type-checked, so mistakes there go unnoticed.
- **Using \`isinstance(x, Never)\`.** \`Never\` is a typing special form; at runtime it raises \`TypeError\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Never</code> is the bottom type: the type with no values. Added in Python 3.11; checkers treat it as the same type as the older <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NoReturn</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Return position:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-&gt; Never</code> means the function never returns normally (it raises or exits), so the code after the call is unreachable and the call fits any return type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Narrowing:</strong> <span style="color:#f0e2c8;">In a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">match</code>, each case removes its type from the subject's union. When every member is handled, what is left in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">case _</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Never</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. assert_never:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_never(arg: Never) -&gt; Never</code> accepts only that empty type. If a case is missing, the leftover type is passed instead and the checker reports exactly that type.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Runtime:</strong> <span style="color:#f0e2c8;">At runtime <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_never</code> raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AssertionError</code> with the value, so a value that slipped past the types still fails loudly.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">None</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Never</code> as a return type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code> means the function returns, with no useful value. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Never</code> means it never returns normally: it raises, calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.exit</code> or loops forever.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Never</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">NoReturn</code> different?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not to a type checker: they are the same bottom type and interchangeable. At runtime they are distinct special forms; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Never</code> reads better for parameters and narrowed types.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Never</code> assignable to every type?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It has no values, so "every value of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Never</code> is also an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>" is vacuously true. That is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return fail(...)</code> type-checks in a function returning <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">reveal_type</code> not print <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Never</code> in the exhaustive branch?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both checkers treat a branch whose subject is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Never</code> as unreachable and skip it. mypy with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--warn-unreachable</code> flags the reveal line; it exempts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_never</code> itself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does this need <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">match</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Narrowing works on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">if</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">elif</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">isinstance</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> against literals or enum members, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is None</code>, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">else: assert_never(x)</code> is checked the same way.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Bottom type (\`Never\`) | The type with no values; assignable to every type, nothing assignable to it |
| \`NoReturn\` | Older name for the same bottom type, mainly used as a return type |
| Type narrowing | Giving a variable a smaller type inside a branch based on the condition or pattern |

**Conclusion:** \`typing.Never\` is the empty type. Used as a return type it marks a call that never comes back; used as a parameter type it marks a function that can accept nothing. Narrowing shrinks a union with every case, and when the cases are exhaustive the leftover in \`case _\` is exactly that empty type — so \`assert_never(x)\`, whose parameter is \`Never\`, is valid only then. Miss a case and the leftover type becomes an argument-type error that names the gap, while at runtime the same call still raises \`AssertionError\`. That one annotation is the whole trick behind exhaustive match checking in Python.`,
    examples: [
      {
        label: `Never at runtime, a toy narrowing model, and assert_never in a match`,
        code: `import typing
from typing import Never, NoReturn, assert_never, get_type_hints

# 1. Never is a special form: an annotation, not a class you can use.
print(repr(Never), type(Never).__name__)
print(get_type_hints(assert_never))
for attempt in (lambda: Never(), lambda: isinstance(1, Never)):
    try:
        attempt()
    except TypeError as e:
        print("TypeError:", e)

# NoReturn is a separate object at runtime; checkers treat the two alike.
print(Never is NoReturn, repr(NoReturn))


# 2. A toy model of what a type checker does inside match: it starts with
#    the declared union and removes whatever each case has already handled.
def narrow(declared, cases):
    remaining = list(declared)
    steps = []
    for handled in cases:
        remaining = [t for t in remaining if t not in handled]
        steps.append(" | ".join(remaining) if remaining else "Never")
    return steps


union = ["Circle", "Square", "Triangle"]
print(narrow(union, [{"Circle"}, {"Square"}, {"Triangle"}]))
print(narrow(union, [{"Circle"}, {"Square"}]))


# 3. The real thing: the subject reaching case _ should have type Never.
class Circle: ...
class Square: ...
class Triangle: ...


def sides(shape: Circle | Square | Triangle) -> int:
    match shape:
        case Circle():
            return 0
        case Square():
            return 4
        case Triangle():
            return 3
        case _:
            # A checker sees type Never here, so this call type-checks.
            assert_never(shape)


print([sides(s) for s in (Circle(), Square(), Triangle())])  # [0, 4, 3]

# At runtime the guard still works if a wrong value sneaks in.
try:
    sides("hexagon")
except AssertionError as e:
    print("AssertionError:", e)`,
      },
      {
        label: `Never as a return type and as a parameter type`,
        code: `import sys
from typing import Literal, Never, assert_never


# Never as a RETURN type: "this function never returns normally".
def fail(message: str) -> Never:
    raise RuntimeError(message)


def parse_port(text: str) -> int:
    if text.isdigit():
        return int(text)
    fail(f"not a port: {text!r}")
    # A checker knows this line is unreachable, so the function does not
    # need a final return statement to satisfy "-> int".


print(parse_port("8080"))  # 8080
try:
    parse_port("http")
except RuntimeError as e:
    print("RuntimeError:", e)

# sys.exit is the stdlib classic: typeshed annotates it as never returning.
try:
    sys.exit(3)
except SystemExit as e:
    print("sys.exit raised SystemExit with code", e.code)


# Never as a PARAMETER type: no argument value is allowed.
# assert_never is exactly that: def assert_never(arg: Never, /) -> Never
LogLevel = Literal["debug", "info", "error"]


def color(level: LogLevel) -> str:
    if level == "debug":
        return "grey"
    elif level == "info":
        return "blue"
    elif level == "error":
        return "red"
    else:
        # if/elif chains narrow too: level is Never here.
        assert_never(level)


print([color(level) for level in ("debug", "info", "error")])


# Narrowing to nothing also produces Never, without any match statement:
def only_ints(x: int | str) -> str:
    if isinstance(x, int):
        return "int"
    if isinstance(x, str):
        return "str"
    # x is Never here; returning fail(...) type-checks for any return type.
    return fail("impossible")


print(only_ints(1), only_ints("a"))
try:
    only_ints(2.5)
except RuntimeError as e:
    print("RuntimeError:", e)`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does Pydantic v2 validation work (BaseModel, field_validator, mode)?`,
    difficulty: "medium",
    seoDescription: `How Pydantic v2 validates: BaseModel coercion, field_validator before/after/wrap/plain modes, model_validator, ValidationError and the validator order.`,
    description: `**Question presented to candidate:**
"Walk me through what happens when you create a Pydantic v2 model from a dict. Where do type conversion and your own \`field_validator\`s run, and what is the difference between the \`before\`, \`after\`, \`wrap\` and \`plain\` modes?"

**What a strong answer should cover:**
- \`BaseModel\` reads the class annotations and builds a validator (a "core schema") once, at class-creation time; the work runs in \`pydantic-core\`, written in Rust. \`Model(**data)\`, \`model_validate(dict)\` and \`model_validate_json(str)\` all go through it.
- Default *lax* mode coerces sensible inputs (\`"42"\` to \`42\`, a tuple to a list, \`"yes"\` to \`True\`) but rejects lossy ones (\`3.5\` for an \`int\`); \`strict=True\` turns coercion off.
- Validation errors are collected per field and raised together as one \`ValidationError\` with \`loc\`, \`type\` and \`msg\` per error.
- \`field_validator\` modes: \`before\` runs on the raw input before type validation, \`after\` (the default) on the already-typed value, \`wrap\` gets a \`handler\` to call the inner validation itself, \`plain\` replaces the type validation completely.
- \`model_validator(mode="before"/"after")\` sees the whole input or the finished model, for cross-field rules; \`ValidationInfo.data\` gives a field validator the fields validated before it.
- Practical details: several before validators run last-defined first, after validators in definition order; assignment is not validated unless \`validate_assignment=True\`; \`model_construct\` skips validation.

**Clarifying questions expected:**
- Is the input trusted Python data or external JSON (which affects strict mode and \`model_validate_json\`)?
- Should the model coerce types, or reject anything not already the right type?

**Code / implementation expected:** Yes — a small model with one \`before\` and one \`after\` validator, and the \`ValidationError\` for bad input.`,
    answer: `**Target Audience:** Python developers who have seen Pydantic models in FastAPI or config code and want to know exactly what runs, in which order, when data is validated.
**Difficulty:** Medium
**Python version:** Pydantic examples verified with pydantic 2.13.5 (pydantic-core 2.46.5) on CPython 3.13. Pydantic is a third-party package, so those two examples are shown as code for the playground; the first example is a standard-library model of the pipeline that runs in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Ideas come in plain language first. Terms an interviewer expects are tagged \`📌 Interview term:\` and defined on the spot; all of them are collected in the Quick Glossary at the end. Every output shown was printed by a real run.

## 1. Why This Even Matters — A Story First

Think of airport security for data. Your bag (the raw input) arrives at the belt.

1. A **porter** can repack it first — take the laptop out, zip a pocket. That is a *before* validator: it sees the raw bag and can change it.
2. The **scanner** checks the bag against the rules: liquids under the limit, nothing forbidden. Some things it fixes for you — your boarding pass printed or on a phone both count. That is Pydantic's built-in *type validation and coercion*.
3. An **officer** after the scanner does checks that only make sense on a scanned bag — "this passport name matches the ticket". That is an *after* validator.
4. Some officers want to **stand around the scanner**, look before and after, or skip it. That is a *wrap* validator.

And crucially, the airport writes down **every** problem with your bag before sending it back, rather than stopping at the first one. Interviewers ask about Pydantic because it sits at the edge of most Python web services (FastAPI uses it for request bodies), and the order of these steps decides whether a validator receives \`"42"\` or \`42\`.

## 2. BaseModel: Annotations Become a Validator

~~~python
class SignUp(BaseModel):
    id: int
    name: str
    tags: list[str] = []
    age: int = Field(default=0, ge=0, le=150)
~~~

📌 **Interview term: \`BaseModel\`** — the Pydantic base class. When the class is *created*, Pydantic reads the type annotations, defaults and \`Field(...)\` constraints and compiles them into a validator. Instances hold validated data; \`model_dump()\` turns them back into dicts.

📌 **Interview term: \`pydantic-core\` / core schema** — the validation engine. Pydantic's own announcement describes it as a rewrite of all validation logic in Rust, exposed through PyO3 ([Pydantic V2 announcement](https://pydantic.dev/articles/pydantic-v2)). V2.0 was released on 2023-06-30 ([release post](https://pydantic.dev/articles/pydantic-v2-final)). The Python class is translated into a tree-shaped description (the *core schema*), and pydantic-core builds the validator from it once per model.

The three entry points all use the same validator:

| Call | Input | Notes |
| :--- | :--- | :--- |
| \`SignUp(**data)\` / \`SignUp(id=1, ...)\` | Python objects as keyword arguments | The usual constructor |
| \`SignUp.model_validate(data)\` | a dict or object | Same, takes the dict itself |
| \`SignUp.model_validate_json(text)\` | a JSON string or bytes | Parses and validates in one pass in Rust |

📌 **Interview term: Lax vs strict mode** — in the default *lax* mode Pydantic converts inputs when the conversion is unambiguous: Example 3 printed \`i=3 f=1.5 b=True\` for \`i="3", f="1.5", b="yes"\`. Lossy or unclear inputs are rejected: \`i=3.5\` gave \`int_from_float\` and \`b="maybe"\` gave \`bool_parsing\`. With \`ConfigDict(strict=True)\` the string \`"3"\` for an \`int\` is rejected (\`int_type\`), though JSON input \`{"i": 3}\` is fine. More on strict mode and \`TypeAdapter\` in [its own question](/interview-question/how-do-typeadapter-strict-mode-and-computed-fields-work-in-pydantic-v2).

## 3. The Validation Pipeline

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="Pipeline: raw input, model before validator, then per field the before validators, the core type validation in Rust and the after validators, then the model after validator, producing the model or a ValidationError with all field errors">
  <defs>
    <marker id="py24q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="66" text-anchor="middle">raw input</text>
  <rect class="d-box" x="230" y="30" width="200" height="60" rx="10"/>
  <text class="d-text" x="330" y="66" text-anchor="middle">model before</text>
  <rect class="d-box" x="20" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="186" text-anchor="middle">field before</text>
  <rect class="d-box-accent" x="230" y="150" width="200" height="60" rx="10"/>
  <text class="d-text" x="330" y="178" text-anchor="middle">core type check</text>
  <text class="d-sub" x="330" y="198" text-anchor="middle">pydantic-core, Rust</text>
  <rect class="d-box" x="490" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="565" y="186" text-anchor="middle">field after</text>
  <rect class="d-box" x="490" y="270" width="150" height="60" rx="10"/>
  <text class="d-text" x="565" y="306" text-anchor="middle">model after</text>
  <rect class="d-box-muted" x="230" y="270" width="200" height="60" rx="10"/>
  <text class="d-text" x="330" y="306" text-anchor="middle">ValidationError</text>
  <line class="d-edge" x1="170" y1="60" x2="226" y2="60" marker-end="url(#py24q5-arrow)"/>
  <line class="d-edge" x1="300" y1="90" x2="120" y2="146" marker-end="url(#py24q5-arrow)"/>
  <line class="d-edge" x1="170" y1="180" x2="226" y2="180" marker-end="url(#py24q5-arrow)"/>
  <line class="d-edge" x1="430" y1="180" x2="486" y2="180" marker-end="url(#py24q5-arrow)"/>
  <line class="d-edge" x1="565" y1="210" x2="565" y2="266" marker-end="url(#py24q5-arrow)"/>
  <line class="d-edge-dashed" x1="330" y1="210" x2="330" y2="266" marker-end="url(#py24q5-arrow)"/>
  <line class="d-edge-dashed" x1="490" y1="300" x2="434" y2="300" marker-end="url(#py24q5-arrow)"/>
</svg>

The middle row runs once per field, and field errors are collected rather than stopping the run. If any field failed, the after-model validator is skipped and one \`ValidationError\` holding all field errors is raised (dashed arrows). Example 1 is a small standard-library model of exactly this order, so you can run it in the page.

## 4. field_validator and Its Four Modes

📌 **Interview term: \`field_validator\`** — a decorator (used together with \`@classmethod\`) that attaches your function to one or more fields. It returns the value to store, or raises to report a problem: a \`ValueError\` becomes a \`value_error\` entry, and on our run an \`assert\` failure became \`assertion_error\` with the message \`Assertion failed, must be positive\`. Prefer \`ValueError\`, because \`assert\` statements disappear under \`python -O\`.

| Mode | Receives | Runs | Typical use |
| :--- | :--- | :--- | :--- |
| \`before\` | the raw input, any type | before the core type check | clean up input: strip strings, split \`"a,b"\` into a list, map legacy values |
| \`after\` (default) | the value already converted to the field type | after the core type check | business rules on a typed value: ranges, formats, normalising case |
| \`wrap\` | the raw input **and** a \`handler\` | around the core check: you call \`handler(v)\` | catch and replace errors, run code both before and after, or skip validation for some inputs |
| \`plain\` | the raw input | **instead of** the core check | full custom parsing; Pydantic does no type check at all |

Example 2 traces the first three modes on a real model. For valid input the order was:

~~~text
  before(name) got '  ada lovelace '
  after(name) got 'ada lovelace'
  wrap(email) in  'ADA@Example.ORG'
  wrap(email) out 'ADA@Example.ORG'
  model after: all fields valid
~~~

The before validator saw the raw padded string; the after validator saw it already stripped; the wrap validator saw the value on both sides of \`handler(v)\`; and the model validator ran last. Example 3 shows \`plain\` mode: \`PlainValidator(lambda v: v)\` on an \`int\` field let the string \`'not an int'\` through, because plain replaces the type check.

📌 **Interview term: \`model_validator\`** — a validator for the whole model. \`mode="before"\` receives the raw input (usually a dict) before any field is validated; \`mode="after"\` receives the finished instance (\`self\`) and returns it, which is the place for rules that span fields.

📌 **Interview term: \`ValidationInfo.data\`** — the second argument a field validator can take. \`info.data\` is a dict of the fields that were already validated, in field-definition order. \`same_password\` in Example 2 compares \`password_again\` with \`info.data.get("password")\`, which works because \`password\` is declared first.

## 5. ValidationError: All Problems at Once

📌 **Interview term: \`ValidationError\`** — the single exception raised when validation fails. \`e.errors()\` returns one dict per problem with \`loc\` (the path to the field, a tuple), \`type\` (a stable machine-readable code such as \`int_parsing\`) and \`msg\` (human text); \`e.error_count()\` counts them.

For bad input Example 2 printed four errors in one exception — a parsing failure, a wrong type, a range constraint and our own \`ValueError\` (prefixed \`Value error,\` by Pydantic):

~~~text
4 errors
  ('id',) int_parsing - Input should be a valid integer, unable to parse string as an integer
  ('name',) string_type - Input should be a valid string
  ('age',) greater_than_equal - Input should be greater than or equal to 0
  ('password_again',) value_error - Value error, passwords do not match
~~~

Note in the trace that for \`name=5\` the before validator ran (\`before(name) got 5\`) but the after validator did not — the core \`str\` check failed in between — and that \`model after\` never ran.

## 6. Order of Several Validators on One Field

When one field has several validators, Example 3 printed this order for \`x: Annotated[int, Before 1, After 1, Wrap 1, Before 2, After 2]\`:

~~~text
    before-2 '7'
    wrap-1 in  '7'
    before-1 '7'
    after-1 7
    wrap-1 out 7
    after-2 7
~~~

Each validator wraps everything declared before it. So before (and wrap) validators run **from last to first**, then the core check, then after validators **from first to last**. The decorator form behaves the same: two \`mode="before"\` \`field_validator\`s ran last-defined first (\`b2\` then \`b1\`), and two after validators in definition order (\`a1\` then \`a2\`), on our 2.13.5 run.

## 7. Things Validation Does Not Cover by Default

- **Assignment:** \`a.n = "oops"\` on a normal model stored the string unchanged. With \`ConfigDict(validate_assignment=True)\`, \`c.n = "2"\` was coerced to \`2\` and \`c.n = "two"\` raised (\`int_parsing\`).
- **\`model_construct(...)\`:** builds an instance with no validation at all — \`Loose.model_construct(n="zz").n\` was \`'zz'\`. Only for data you already trust, such as rows from your own database.
- **Defaults:** default values are not validated. On our run \`n: int = "zz"\` gave an instance whose \`n\` was \`'zz'\`; with \`ConfigDict(validate_default=True)\` a default of \`"5"\` was coerced to \`5\`.

## 8. Verified: Running the Code

Example 1 (standard-library model) on python3.11 — identical in the page on Pyodide:

~~~text
  after: positive 42
  before: strip '  ada lovelace '
  after: title 'ada lovelace'
User({'id': 42, 'name': 'Ada Lovelace'})
  after: positive 7
  before: strip 'grace'
  after: title 'grace'
User({'id': 7, 'name': 'Grace'})
  before: strip 5
2 validation errors: [('id', 'int_parsing'), ('name', 'string_type')]
  after: positive -3
2 validation errors: [('id', 'must be positive'), ('name', 'missing')]
~~~

Example 2 (real Pydantic) on python3.13 with pydantic 2.13.5:

~~~text
pydantic 2.13.5
valid input:
  before(name) got '  ada lovelace '
  after(name) got 'ada lovelace'
  wrap(email) in  'ADA@Example.ORG'
  wrap(email) out 'ADA@Example.ORG'
  model after: all fields valid
{'id': 42, 'name': 'Ada Lovelace', 'email': 'ada@example.org', 'tags': ['math', 'engines'], 'age': 0}
int list
invalid input:
  before(name) got 5
  wrap(email) in  'e'
  wrap(email) out 'e'
4 errors
  ('id',) int_parsing - Input should be a valid integer, unable to parse string as an integer
  ('name',) string_type - Input should be a valid string
  ('age',) greater_than_equal - Input should be greater than or equal to 0
  ('password_again',) value_error - Value error, passwords do not match
from JSON:
  before(name) got 'grace'
  after(name) got 'grace'
  wrap(email) in  'G@X.IO'
  wrap(email) out 'G@X.IO'
  model after: all fields valid
Grace
~~~

Example 3:

~~~text
validator order for x='7':
    before-2 '7'
    wrap-1 in  '7'
    before-1 '7'
    after-1 7
    wrap-1 out 7
    after-2 7
i=3 f=1.5 b=True
lax rejects: [('i', 'int_from_float'), ('b', 'bool_parsing')]
strict rejects '3': int_type
strict JSON accepts: i=3
plain keeps a str in an int field: 'not an int'
Loose after assignment: 'oops'
Checked coerced: 2
Checked rejects: int_parsing
model_construct: 'zz'
~~~

These two cannot run in the page: the page runs Pyodide with the standard library only, so \`pydantic\` is not importable there. Use the playground hand-off or a local \`pip install pydantic\`.

## 9. Pydantic v2 vs the Alternatives

| Tool | Validates at runtime | Coerces types | Error reporting | Best for |
| :--- | :--- | :--- | :--- | :--- |
| Type hints + mypy | No (static only) | No | Checker messages | Your own code |
| \`@dataclass\` | No | No | None | Plain data containers ([dataclasses](/interview-question/what-are-dataclasses)) |
| Hand-written \`__init__\` checks | Yes | Whatever you write | First failure, usually | Tiny cases |
| Pydantic v2 \`BaseModel\` | Yes | Yes (lax), or strict | All errors, structured | External input: HTTP, JSON, config, env |

## Common Pitfalls

- **Forgetting \`@classmethod\` under \`@field_validator\`.** The validator is a class method; put \`@classmethod\` directly beneath the decorator as in the examples.
- **Assuming an after validator sees the raw input.** It sees the converted value; to strip or reshape raw input use \`mode="before"\`.
- **Reading a later field from \`info.data\`.** Only fields declared earlier are there; a missing or failed earlier field is simply absent, so use \`.get()\`.
- **Expecting assignment to be validated.** It is not unless \`validate_assignment=True\`.
- **Using \`plain\` when you meant \`before\`.** Plain skips the type check entirely, so a wrong type gets stored.
- **Mixing v1 and v2 APIs.** \`@validator\`, \`.dict()\` and \`parse_obj\` are v1 names; v2 uses \`@field_validator\`, \`model_dump()\` and \`model_validate()\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The model:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BaseModel</code> compiles the annotations, defaults and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Field</code> constraints into a validator once per class; pydantic-core, written in Rust, runs it for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Model(...)</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model_validate</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model_validate_json</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Coercion:</strong> <span style="color:#f0e2c8;">Lax mode by default: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"42"</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">42</code>, a tuple becomes a list, but <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3.5</code> is rejected for an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict=True</code> turns coercion off.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Validator modes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">before</code> gets the raw input, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">after</code> (the default) gets the typed value, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">wrap</code> gets a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handler</code> to call the inner validation, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">plain</code> replaces the type check entirely.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Whole model:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model_validator(mode="before")</code> sees the raw dict, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">mode="after"</code> sees the finished instance for cross-field rules; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">info.data</code> holds fields validated earlier.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Errors:</strong> <span style="color:#f0e2c8;">All field errors are collected into one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValidationError</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loc</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">type</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">msg</code> per error, and the after-model validator is skipped if any field failed.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">In which order do several validators on one field run?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each wraps the ones declared before it: before and wrap validators run last-defined first, then the core check, then after validators in definition order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is assignment validated?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by default: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">m.n = "oops"</code> stores the string. Set <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ConfigDict(validate_assignment=True)</code> to run the field validation on every assignment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">wrap</code> mode?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you need code on both sides of validation or want to catch its failure, for example returning a fallback value if <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">handler(v)</code> raises a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValidationError</code> (on our run such a validator turned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n="bad"</code> into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0</code>).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you validate one field against another?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a field validator with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">info: ValidationInfo</code> and read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">info.data</code> for earlier fields, or a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">model_validator(mode="after")</code> that checks <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you create an instance without validation?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Model.model_construct(...)</code>. It skips every check, so use it only for data you already trust.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| \`BaseModel\` | Pydantic base class; annotations become a compiled validator |
| \`pydantic-core\` / core schema | The Rust validation engine and the schema tree it is built from |
| Lax vs strict mode | Lax coerces unambiguous inputs; strict requires the exact type |
| \`field_validator\` | Decorator attaching a \`before\`, \`after\`, \`wrap\` or \`plain\` validator to fields |
| \`model_validator\` | Validator for the whole input (\`before\`) or the finished model (\`after\`) |
| \`ValidationInfo.data\` | Fields already validated, available to a field validator |
| \`ValidationError\` | One exception holding every error with \`loc\`, \`type\`, \`msg\` |

**Conclusion:** Pydantic v2 turns a class's annotations into a compiled validator that pydantic-core runs in Rust: an optional model-level before step, then per field the before validators, the core type check with lax or strict coercion, and the after validators, then the model-level after step — collecting every failure into one structured \`ValidationError\`. The four \`field_validator\` modes are simply positions in that pipeline: before the type check, after it, around it, or instead of it. Knowing that order, plus the defaults it does not cover (assignment, \`model_construct\`, defaults), is what lets you predict exactly what a validator will receive.`,
    examples: [
      {
        label: `A standard-library model of the validation pipeline (runs in the page)`,
        code: `# A standard-library MODEL of the Pydantic v2 pipeline (not Pydantic itself),
# so the order of steps can run in the browser. The real library is in the
# next two examples.

class FieldError(Exception):
    pass


def to_int(v):                      # "lax mode" core validator for int
    if isinstance(v, bool):
        return int(v)
    if isinstance(v, int):
        return v
    if isinstance(v, float) and v.is_integer():
        return int(v)
    if isinstance(v, str) and v.strip().lstrip("-").isdigit():
        return int(v)
    raise FieldError("int_parsing")


def to_str(v):
    if isinstance(v, str):
        return v
    raise FieldError("string_type")


class MiniModel:
    fields = {}       # name -> core validator
    before = {}       # name -> list of before validators (definition order)
    after = {}        # name -> list of after validators (definition order)

    def __init__(self, **data):
        errors, values = [], {}
        for name, core in self.fields.items():
            if name not in data:
                errors.append((name, "missing"))
                continue
            v = data[name]
            try:
                for fn in reversed(self.before.get(name, [])):   # last defined runs first
                    v = fn(v)
                v = core(v)                                       # type check / coercion
                for fn in self.after.get(name, []):               # definition order
                    v = fn(v)
                values[name] = v
            except (FieldError, ValueError) as e:
                errors.append((name, str(e)))                     # keep going: collect all
        if errors:
            raise ValueError(f"{len(errors)} validation errors: {errors}")
        self.__dict__.update(values)

    def __repr__(self):
        return f"{type(self).__name__}({self.__dict__})"


def strip(v):
    print("  before: strip", repr(v))
    return v.strip() if isinstance(v, str) else v


def title(v):
    print("  after: title", repr(v))
    return v.title()


def positive(v):
    print("  after: positive", repr(v))
    if v <= 0:
        raise ValueError("must be positive")
    return v


class User(MiniModel):
    fields = {"id": to_int, "name": to_str}
    before = {"name": [strip]}
    after = {"id": [positive], "name": [title]}


print(User(id="42", name="  ada lovelace "))
print(User(id=7.0, name="grace"))
try:
    User(id="4x", name=5)
except ValueError as e:
    print(e)
try:
    User(id="-3")
except ValueError as e:
    print(e)`,
      },
      {
        label: `Real Pydantic v2: BaseModel, before/after/wrap validators, ValidationError`,
        code: `# Needs pydantic v2 (pip install pydantic). Verified with pydantic 2.13.5 on Python 3.13.
from typing import Any

import pydantic
from pydantic import BaseModel, Field, ValidationError, ValidationInfo, field_validator, model_validator

print("pydantic", pydantic.VERSION)


class SignUp(BaseModel):
    id: int
    name: str
    email: str
    tags: list[str] = []
    age: int = Field(default=0, ge=0, le=150)
    password: str
    password_again: str

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: Any) -> Any:
        print("  before(name) got", repr(v))
        return v.strip() if isinstance(v, str) else v

    @field_validator("name")                     # mode="after" is the default
    @classmethod
    def title_name(cls, v: str) -> str:
        print("  after(name) got", repr(v))
        return v.title()

    @field_validator("email", mode="wrap")
    @classmethod
    def lower_email(cls, v: Any, handler) -> str:
        print("  wrap(email) in ", repr(v))
        result = handler(v)                      # run the normal str validation
        print("  wrap(email) out", repr(result))
        return result.lower()

    @field_validator("password_again")
    @classmethod
    def same_password(cls, v: str, info: ValidationInfo) -> str:
        if v != info.data.get("password"):     # fields validated earlier
            raise ValueError("passwords do not match")
        return v

    @model_validator(mode="after")
    def whole_model(self) -> "SignUp":
        print("  model after: all fields valid")
        return self


print("valid input:")
u = SignUp(id="42", name="  ada lovelace ", email="ADA@Example.ORG",
           tags=("math", "engines"), password="pw", password_again="pw")
print(u.model_dump(exclude={"password", "password_again"}))
print(type(u.id).__name__, type(u.tags).__name__)

print("invalid input:")
try:
    SignUp(id="4x", name=5, email="e", age=-1, password="a", password_again="b")
except ValidationError as e:
    print(e.error_count(), "errors")
    for err in e.errors():
        print(" ", err["loc"], err["type"], "-", err["msg"])

print("from JSON:")
print(SignUp.model_validate_json(
    '{"id": 7, "name": "grace", "email": "G@X.IO", "password": "p", "password_again": "p"}'
).name)`,
        runnable: false,
        python: "3.13",
      },
      {
        label: `Validator order, strict vs lax, plain mode and validate_assignment`,
        code: `# Needs pydantic v2 (pip install pydantic). Verified with pydantic 2.13.5 on Python 3.13.
from typing import Annotated

from pydantic import (AfterValidator, BaseModel, BeforeValidator, ConfigDict,
                      PlainValidator, ValidationError, WrapValidator)


def tag(name):
    def check(v):
        print("   ", name, repr(v))
        return v
    return check


def wrap_tag(name):
    def check(v, handler):
        print("   ", name, "in ", repr(v))
        out = handler(v)
        print("   ", name, "out", repr(out))
        return out
    return check


# 1. Order of several validators on one field (Annotated form).
class Order(BaseModel):
    x: Annotated[int,
                 BeforeValidator(tag("before-1")),
                 AfterValidator(tag("after-1")),
                 WrapValidator(wrap_tag("wrap-1")),
                 BeforeValidator(tag("before-2")),
                 AfterValidator(tag("after-2"))]


print("validator order for x='7':")
Order(x="7")


# 2. Lax (default) vs strict mode.
class Lax(BaseModel):
    i: int
    f: float
    b: bool


class Strict(BaseModel):
    model_config = ConfigDict(strict=True)
    i: int


print(Lax(i="3", f="1.5", b="yes"))
try:
    Lax(i=3.5, f=1, b="maybe")
except ValidationError as e:
    print("lax rejects:", [(err["loc"][0], err["type"]) for err in e.errors()])
try:
    Strict(i="3")
except ValidationError as e:
    print("strict rejects '3':", e.errors()[0]["type"])
print("strict JSON accepts:", Strict.model_validate_json('{"i": 3}'))


# 3. mode="plain" replaces the core validation entirely.
class Plain(BaseModel):
    x: Annotated[int, PlainValidator(lambda v: v)]


print("plain keeps a str in an int field:", repr(Plain(x="not an int").x))


# 4. Assignment is not validated unless you ask for it.
class Loose(BaseModel):
    n: int


class Checked(BaseModel):
    model_config = ConfigDict(validate_assignment=True)
    n: int


a = Loose(n=1)
a.n = "oops"
print("Loose after assignment:", repr(a.n))
c = Checked(n=1)
c.n = "2"
print("Checked coerced:", repr(c.n))
try:
    c.n = "two"
except ValidationError as e:
    print("Checked rejects:", e.errors()[0]["type"])

# 5. model_construct skips validation completely (trusted data only).
print("model_construct:", repr(Loose.model_construct(n="zz").n))`,
        runnable: false,
        python: "3.13",
      },
    ],
  },
];

export default augments;
