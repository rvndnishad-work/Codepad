/**
 * PYTHON ULTRA — batch 22: CPython internals — how CPython executes code, the small-integer cache,
 * string interning, Timsort, and the Global Interpreter Lock.
 * Every example was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does CPython execute your code?`,
    difficulty: "hard",
    seoDescription: `How CPython runs a .py file: tokenizer, parser, AST, compiler, bytecode, .pyc caching and the eval loop, with the 3.11 adaptive interpreter, all verified.`,
    description: `**Question presented to candidate:**
"When I type \`python app.py\`, what actually happens between the text in that file and the program running? Is Python compiled or interpreted, what are bytecode and \`.pyc\` files, and what changed in CPython 3.11 to make it faster?"

**What a strong answer should cover:**
- The pipeline: the tokenizer turns text into tokens, the parser builds an AST, the compiler turns the AST into a **code object** holding bytecode, and the interpreter's eval loop runs that bytecode
- Python is "compiled to bytecode, then interpreted": the whole file is compiled first, so a \`SyntaxError\` anywhere stops even line 1, while a \`NameError\` only appears when that line runs
- The eval loop is a **stack machine**: instructions such as \`LOAD_FAST\`, \`BINARY_OP\`, \`STORE_FAST\` push and pop a value stack inside a per-call **frame**; \`dis\` shows them
- Imported modules cache bytecode in \`__pycache__/name.cpython-311.pyc\` (16-byte header, then a marshalled code object); the script you run directly is not cached, and a \`.pyc\` only skips compiling, it does not make code run faster
- Bytecode is a CPython implementation detail that changes between versions (different instructions in 3.11, 3.12 and 3.13 for the same function)
- 3.11's specializing adaptive interpreter (PEP 659) rewrites hot instructions into type-specific ones such as \`BINARY_OP_ADD_INT\`; an experimental JIT followed in 3.13 (PEP 744)

**Code / implementation expected:** Optional — reading \`dis\` output for a small function and explaining each instruction is the usual exercise.`,
    answer: `**Target Audience:** Python developers who have written functions and loops and want to know what the interpreter does with them. No C or compiler background is assumed.
**Difficulty:** Hard
**Python version:** Behaviour and \`dis\` output checked on CPython 3.11, with the differences on 3.12 and 3.13 shown where they matter. Both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain words first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined on the spot. All of them are collected in the Quick Glossary at the end. Every output shown was produced by running the code.

## 1. Why This Even Matters — A Story First

Imagine you hire a translator to read a recipe written in French to a cook who only understands a short list of hand signals: "pick up", "put down", "mix", "pour". The translator does not stand next to the cook translating each French sentence on the fly while the cook waits. She first reads the whole recipe, checks that every sentence makes sense, and writes it out as a numbered list of hand signals. Then the cook works through that list, one signal at a time, as fast as possible. If the recipe has a sentence that is not real French, she refuses before the cook has touched a single egg.

CPython works exactly like that. **Your \`.py\` file is the French recipe. The compiler is the translator. The hand-signal list is bytecode. The cook is the eval loop.** Interviewers ask this question because it separates people who think of Python as "magic that runs my text" from people who can explain why a syntax error stops a file before line 1 runs, why \`.pyc\` files exist, why the same function is faster on 3.11 than on 3.10, and what \`dis\` output means.

📌 **Interview term: CPython** — the reference implementation of Python, written in C, that you get from python.org and most package managers. Other implementations (PyPy, MicroPython, GraalPy) run the same language differently. Everything in this doc is about CPython.

## 2. The Pipeline in One Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 900 230" role="img" aria-label="CPython pipeline: source text goes to the tokenizer, the parser builds an AST, the compiler makes a code object, and the eval loop runs it">
  <defs>
    <marker id="py22q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="330" y="30" text-anchor="middle">done once, before anything runs</text>
  <text class="d-sub" x="790" y="30" text-anchor="middle">done on every run</text>
  <rect class="d-box" x="20" y="70" width="130" height="70" rx="8"/>
  <text class="d-text" x="85" y="100" text-anchor="middle">source</text>
  <text class="d-sub" x="85" y="122" text-anchor="middle">app.py text</text>
  <rect class="d-box-muted" x="200" y="70" width="130" height="70" rx="8"/>
  <text class="d-text" x="265" y="100" text-anchor="middle">tokens</text>
  <text class="d-sub" x="265" y="122" text-anchor="middle">tokenizer</text>
  <rect class="d-box-muted" x="380" y="70" width="130" height="70" rx="8"/>
  <text class="d-text" x="445" y="100" text-anchor="middle">AST</text>
  <text class="d-sub" x="445" y="122" text-anchor="middle">parser</text>
  <rect class="d-box-accent" x="560" y="70" width="140" height="70" rx="8"/>
  <text class="d-text" x="630" y="100" text-anchor="middle">code object</text>
  <text class="d-sub" x="630" y="122" text-anchor="middle">compiler</text>
  <rect class="d-box" x="750" y="70" width="130" height="70" rx="8"/>
  <text class="d-text" x="815" y="100" text-anchor="middle">eval loop</text>
  <text class="d-sub" x="815" y="122" text-anchor="middle">runs bytecode</text>
  <path class="d-edge" d="M 150 105 L 196 105" marker-end="url(#py22q1-arrow)"/>
  <path class="d-edge" d="M 330 105 L 376 105" marker-end="url(#py22q1-arrow)"/>
  <path class="d-edge" d="M 510 105 L 556 105" marker-end="url(#py22q1-arrow)"/>
  <path class="d-edge-accent" d="M 700 105 L 746 105" marker-end="url(#py22q1-arrow)"/>
  <rect class="d-box-muted" x="560" y="170" width="140" height="44" rx="8"/>
  <text class="d-sub" x="630" y="197" text-anchor="middle">.pyc cache</text>
  <path class="d-edge-dashed" d="M 630 142 L 630 166" marker-end="url(#py22q1-arrow)"/>
</svg>

The first three steps happen once per file. Their result, the code object, is what actually runs, and for imported modules it is also saved to disk as a \`.pyc\` file so the next run can skip straight to the eval loop.

Here is each stage on the one-line program \`total = price * qty + 1\`, taken from Example 1.

### 2a. Tokenizer: text into words

📌 **Interview term: Tokenizer (lexer)** — the stage that cuts raw text into **tokens**: names, operators, numbers, strings, and the special \`NEWLINE\`, \`INDENT\` and \`DEDENT\` tokens that make indentation meaningful in Python. The \`tokenize\` module exposes it.

~~~text
NAME       'total'
OP         '='
NAME       'price'
OP         '*'
NAME       'qty'
OP         '+'
NUMBER     '1'
NEWLINE    '\\n'
ENDMARKER  ''
~~~

At this point Python knows nothing about meaning. \`price\` is just "a name".

### 2b. Parser: words into a tree

📌 **Interview term: AST (abstract syntax tree)** — a tree that represents the structure of the code: "assign to \`total\` the result of adding \`1\` to the product of \`price\` and \`qty\`". Operator precedence is already settled here. The \`ast\` module lets you build, inspect and even rewrite it (tools such as pytest's assertion rewriting do exactly that).

~~~text
BinOp(left=BinOp(left=Name(id='price', ctx=Load()), op=Mult(), right=Name(id='qty', ctx=Load())), op=Add(), right=Constant(value=1))
~~~

The multiplication is nested *inside* the addition: that is precedence, decided by the parser. A \`SyntaxError\` is raised at this stage, which is why it stops the whole file.

### 2c. Compiler: tree into bytecode

📌 **Interview term: Bytecode** — a compact list of simple instructions for CPython's virtual machine, such as "push the local variable \`a\`" or "add the top two values". It is not machine code for your CPU; it is code for an imaginary machine that CPython's C code simulates.

📌 **Interview term: Code object** — the compiled result: a \`code\` object holding the bytecode (\`co_code\`) plus the tables it refers to: constants (\`co_consts\`), global and attribute names (\`co_names\`), local variable names (\`co_varnames\`), how deep the stack can get (\`co_stacksize\`), and line-number information. Every function has one at \`func.__code__\`.

~~~text
code
('price', 'qty', 'total')
(1, None)
22 bytes of bytecode
  0           0 RESUME                   0

  1           2 LOAD_NAME                0 (price)
              4 LOAD_NAME                1 (qty)
              6 BINARY_OP                5 (*)
             10 LOAD_CONST               0 (1)
             12 BINARY_OP                0 (+)
             16 STORE_NAME               2 (total)
             18 LOAD_CONST               1 (None)
             20 RETURN_VALUE
~~~

How to read a \`dis\` line: the first column is the **source line number**, the second is the **byte offset** of the instruction, then the instruction name, its numeric argument, and in brackets what that argument means. \`LOAD_NAME 0 (price)\` means "look up entry 0 of \`co_names\`, which is \`price\`". Every instruction is 2 bytes (an opcode and an argument), which is why offsets go up by 2. Where they jump by 4 (6 to 10, 12 to 16), the gap is an **inline cache** entry that \`BINARY_OP\` reserves for the adaptive interpreter in section 5; \`dis\` hides those unless you pass \`show_caches=True\`.

Notice the hidden \`LOAD_CONST None\` / \`RETURN_VALUE\` at the end: a module, like a function that falls off its end, returns \`None\`.

### 2d. The eval loop: running the bytecode

📌 **Interview term: Eval loop (the interpreter loop)** — the C function at the heart of CPython (\`_PyEval_EvalFrameDefault\` in \`Python/ceval.c\`) that fetches the next instruction, jumps to the C code for that opcode, runs it, and repeats. From the 3.12 development cycle on (GH-98831), the body of each instruction is written in \`Python/bytecodes.c\` and generated into \`Python/generated_cases.c.h\` by a tool ([CPython: interpreter definition notes](https://chromium.googlesource.com/external/github.com/python/cpython/+/e01831760e3c7cb9cdba78b048c8052808a3a663/Tools/cases_generator/interpreter_definition.md)).

\`exec(code, namespace)\` hands a code object to the eval loop. With \`price = 20\` and \`qty = 3\` in the namespace, Example 1 prints \`total = 61\`.

## 3. A Stack Machine, Step by Step

📌 **Interview term: Stack-based virtual machine** — a machine whose instructions take their inputs from the top of a **value stack** and push their results back onto it, instead of naming registers. \`BINARY_OP +\` means "pop two values, add them, push the sum". CPython's VM is stack-based.

📌 **Interview term: Frame** — the record of one running call: which code object it runs, its local variables, its value stack, the instruction it is on, and a link to the caller's frame. \`sys._getframe()\` returns the current one; tracebacks are a printout of the chain of frames.

Take this function from Example 2:

~~~python
def area(width, height):
    border = 2
    return (width + border) * height
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 860 260" role="img" aria-label="Value stack after each instruction of area 3 4: push 3, push 2, add gives 5, push 4, multiply gives 20">
  <text class="d-sub" x="95" y="30" text-anchor="middle">LOAD_FAST width</text>
  <text class="d-sub" x="265" y="30" text-anchor="middle">LOAD_FAST border</text>
  <text class="d-sub" x="435" y="30" text-anchor="middle">BINARY_OP +</text>
  <text class="d-sub" x="605" y="30" text-anchor="middle">LOAD_FAST height</text>
  <text class="d-sub" x="775" y="30" text-anchor="middle">BINARY_OP *</text>
  <rect class="d-box-muted" x="40" y="60" width="110" height="180" rx="8"/>
  <rect class="d-box-muted" x="210" y="60" width="110" height="180" rx="8"/>
  <rect class="d-box-muted" x="380" y="60" width="110" height="180" rx="8"/>
  <rect class="d-box-muted" x="550" y="60" width="110" height="180" rx="8"/>
  <rect class="d-box-muted" x="720" y="60" width="110" height="180" rx="8"/>
  <rect class="d-box-accent" x="55" y="180" width="80" height="44" rx="6"/>
  <text class="d-text" x="95" y="207" text-anchor="middle">3</text>
  <rect class="d-box" x="225" y="180" width="80" height="44" rx="6"/>
  <text class="d-text" x="265" y="207" text-anchor="middle">3</text>
  <rect class="d-box-accent" x="225" y="120" width="80" height="44" rx="6"/>
  <text class="d-text" x="265" y="147" text-anchor="middle">2</text>
  <rect class="d-box-accent" x="395" y="180" width="80" height="44" rx="6"/>
  <text class="d-text" x="435" y="207" text-anchor="middle">5</text>
  <rect class="d-box" x="565" y="180" width="80" height="44" rx="6"/>
  <text class="d-text" x="605" y="207" text-anchor="middle">5</text>
  <rect class="d-box-accent" x="565" y="120" width="80" height="44" rx="6"/>
  <text class="d-text" x="605" y="147" text-anchor="middle">4</text>
  <rect class="d-box-accent" x="735" y="180" width="80" height="44" rx="6"/>
  <text class="d-text" x="775" y="207" text-anchor="middle">20</text>
</svg>

Each column is the value stack right after the instruction named above it, for the call \`area(3, 4)\`; the highlighted box is what that instruction just pushed.

Example 2 proves this is really how the bytecode works by writing a **toy eval loop in Python**: it walks \`dis.get_instructions(area)\`, keeps a Python list as the value stack and another as the locals array, and handles the five opcodes this function uses. It gets the same answer as the real call:

~~~text
real : 20
LOAD_CONST   2       stack=[2]
STORE_FAST   border  stack=[]
LOAD_FAST    width   stack=[3]
LOAD_FAST    border  stack=[3, 2]
BINARY_OP    +       stack=[5]
LOAD_FAST    height  stack=[5, 4]
BINARY_OP    *       stack=[20]
toy  : 20
~~~

A few CPython details hide in that trace:

- **Locals are an array, not a dict.** \`LOAD_FAST 0\` indexes slot 0 of the frame's local array; the compiler decided at compile time which slot \`width\` lives in. That is why local variables are faster than globals (\`LOAD_GLOBAL\` has to look a name up in dictionaries) and why \`locals()\` inside a function is a snapshot rather than the real storage.
- **Module-level code uses \`LOAD_NAME\` / \`STORE_NAME\`**, which go through the namespace dict, because module globals cannot be assigned slots ahead of time.
- **\`co_stacksize\`** is computed by the compiler, so the frame allocates exactly enough stack: 2 for \`area\`.

## 4. Compiled or Interpreted? Both.

The honest answer is "compiled to bytecode, then the bytecode is interpreted". Two observable consequences, both in Example 1:

~~~text
SyntaxError at compile time, line 2
defining f was fine
NameError at run time: name 'undefined_name' is not defined
~~~

- The bad program was \`print('line 1 ran')\` followed by \`x = = 2\`. Nothing printed "line 1 ran": the compiler rejected the whole file before the eval loop saw any of it.
- A function that refers to a name that does not exist compiles fine. The compiler only emits \`LOAD_GLOBAL undefined_name\`; the lookup fails when the function is *called*. That is dynamic name resolution, and it is why linters exist.

📌 **Interview term: Compile time vs run time** — compile time is when source becomes a code object (syntax checking, deciding local slots, folding constants like \`999 + 1\` into \`1000\`); run time is when the eval loop executes it (name lookups, type checks, exceptions).

## 5. The \`.pyc\` Cache

📌 **Interview term: \`.pyc\` file** — a cached, compiled module: a 16-byte header followed by the code object serialised with the \`marshal\` module. When you \`import models\`, CPython looks for \`__pycache__/models.cpython-311.pyc\`; if its header still matches the source, it loads the code object and skips tokenizing, parsing and compiling.

Example 1 prints the cache path for a module:

~~~text
/proj/app/__pycache__/models.cpython-311.pyc
~~~

The \`cpython-311\` tag lets several Python versions share one folder without overwriting each other. On our 3.11 run, \`py_compile\` of a two-line module wrote a header whose first 4 bytes equalled \`importlib.util.MAGIC_NUMBER\`, whose flags word was 0, and whose last 4 bytes equalled the source size (20 bytes), and \`marshal.loads\` on the rest gave back a code object with \`co_consts == (42, None)\` (the compiler had already folded \`41 + 1\`). The 16-byte layout with a flags word comes from [PEP 552](https://peps.python.org/pep-0552/) (Python 3.7), which also added hash-based \`.pyc\` files for reproducible builds.

Things to say precisely in an interview:

- **A \`.pyc\` makes start-up faster, not the program.** It skips compilation; the eval loop runs the same bytecode either way.
- **The script you run directly (\`python app.py\`) is compiled every time and not cached.** Only imported modules get a \`.pyc\`.
- **The magic number changes when the bytecode format changes**, so a 3.12 interpreter ignores a 3.11 \`.pyc\`. On our runs it was \`b'\\xa7\\r\\r\\n'\` on 3.11, \`b'\\xcb\\r\\r\\n'\` on 3.12 and \`b'\\xf3\\r\\r\\n'\` on 3.13.

## 6. Bytecode Is Not Stable — and Not Fixed at Run Time

The same \`add(a, b)\` function, disassembled on three versions (our runs):

| Version | Bytecode for \`total = a + b; return total\` |
| :--- | :--- |
| 3.11 | \`RESUME\`, \`LOAD_FAST a\`, \`LOAD_FAST b\`, \`BINARY_OP +\`, \`STORE_FAST total\`, \`LOAD_FAST total\`, \`RETURN_VALUE\` |
| 3.12 | same as 3.11 for this function; module code ends in the new \`RETURN_CONST None\` |
| 3.13 | \`LOAD_FAST_LOAD_FAST (a, b)\` fuses two loads into one instruction; \`dis\` no longer prints offsets by default |

So never write code that depends on specific opcodes, and treat \`dis\` output in interviews as "this is what 3.11 does".

### The specializing adaptive interpreter (3.11+)

Python is dynamically typed: \`a + b\` might add ints, strings, lists or your own class. A generic \`BINARY_OP\` has to check the types every time. Since 3.11, CPython watches each instruction as it runs; when a site keeps seeing the same types, it **rewrites that one instruction in place** into a specialised version that checks the type once and takes a fast path. If the types change, it falls back and re-specialises.

📌 **Interview term: Specializing adaptive interpreter** — the 3.11 technique from [PEP 659](https://peps.python.org/pep-0659/) (Mark Shannon, the "Faster CPython" work) where hot bytecode instructions are replaced by type-specialised variants such as \`BINARY_OP_ADD_INT\` or \`LOAD_ATTR_INSTANCE_VALUE\`, using the inline cache slots after each instruction to remember what they saw. It is the main reason 3.11 benchmarks faster than 3.10.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 200" role="img" aria-label="One BINARY_OP site becomes BINARY_OP_ADD_INT after many int calls, then BINARY_OP_ADD_UNICODE after string calls">
  <defs>
    <marker id="py22q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="70" width="200" height="70" rx="8"/>
  <text class="d-text" x="120" y="100" text-anchor="middle">BINARY_OP</text>
  <text class="d-sub" x="120" y="122" text-anchor="middle">generic, cold</text>
  <rect class="d-box-accent" x="330" y="70" width="200" height="70" rx="8"/>
  <text class="d-text" x="430" y="100" text-anchor="middle">BINARY_OP_ADD_INT</text>
  <text class="d-sub" x="430" y="122" text-anchor="middle">int fast path</text>
  <rect class="d-box-accent" x="640" y="70" width="200" height="70" rx="8"/>
  <text class="d-text" x="740" y="100" text-anchor="middle">ADD_UNICODE</text>
  <text class="d-sub" x="740" y="122" text-anchor="middle">str fast path</text>
  <path class="d-edge-accent" d="M 222 105 L 326 105" marker-end="url(#py22q1-arrow2)"/>
  <text class="d-sub" x="274" y="52" text-anchor="middle">100 int calls</text>
  <path class="d-edge-accent" d="M 532 105 L 636 105" marker-end="url(#py22q1-arrow2)"/>
  <text class="d-sub" x="584" y="52" text-anchor="middle">100 str calls</text>
</svg>

Example 2 watches it happen with \`dis.get_instructions(func, adaptive=True)\`, which shows the bytecode as it currently is in memory:

~~~text
cold        : ['BINARY_OP']
after ints  : ['BINARY_OP_ADD_INT']
after strs  : ['BINARY_OP_ADD_UNICODE']
~~~

The same three lines printed on 3.12 and 3.13. Specialisation never changes *what* your code does, only how fast the common case runs, so it stays invisible unless you ask \`dis\` for the adaptive view.

**After 3.11.** CPython 3.13 added an experimental JIT compiler, off by default and enabled with a build-time option, described in [PEP 744](https://peps.python.org/pep-0744/); it uses a "copy-and-patch" technique and needs LLVM only when CPython itself is built. The interpreter described here is still what runs your code in a normal build.

## 7. Verified: Running the Code

Both examples run in the page. Example 1 (the four stages on one line of code, then compile-time vs run-time errors and the cache path) printed:

~~~text
== tokens ==
NAME       'total'
OP         '='
NAME       'price'
OP         '*'
NAME       'qty'
OP         '+'
NUMBER     '1'
NEWLINE    '\\n'
ENDMARKER  ''
== AST ==
BinOp(left=BinOp(left=Name(id='price', ctx=Load()), op=Mult(), right=Name(id='qty', ctx=Load())), op=Add(), right=Constant(value=1))
== code object ==
code
('price', 'qty', 'total')
(1, None)
22 bytes of bytecode
  0           0 RESUME                   0

  1           2 LOAD_NAME                0 (price)
              4 LOAD_NAME                1 (qty)
              6 BINARY_OP                5 (*)
             10 LOAD_CONST               0 (1)
             12 BINARY_OP                0 (+)
             16 STORE_NAME               2 (total)
             18 LOAD_CONST               1 (None)
             20 RETURN_VALUE
total = 61
SyntaxError at compile time, line 2
defining f was fine
NameError at run time: name 'undefined_name' is not defined
/proj/app/__pycache__/models.cpython-311.pyc
~~~

Example 2 (the toy eval loop, the adaptive interpreter and frames) printed:

~~~text
real : 20
LOAD_CONST   2       stack=[2]
STORE_FAST   border  stack=[]
LOAD_FAST    width   stack=[3]
LOAD_FAST    border  stack=[3, 2]
BINARY_OP    +       stack=[5]
LOAD_FAST    height  stack=[5, 4]
BINARY_OP    *       stack=[20]
toy  : 20
cold        : ['BINARY_OP']
after ints  : ['BINARY_OP_ADD_INT']
after strs  : ['BINARY_OP_ADD_UNICODE']
('where_am_i', 'caller')
~~~

What the output proves:

- \`co_names\` holds the names, \`co_consts\` the constants, and the bytecode is 22 bytes for one line of code: the code object is just data.
- The toy loop, which only understands stack pushes, pops and a dispatch on the opcode name, computed the same \`20\` as the real interpreter.
- \`adaptive=True\` shows the instruction at the \`+\` site changing from \`BINARY_OP\` to \`BINARY_OP_ADD_INT\` and then to \`BINARY_OP_ADD_UNICODE\` as the argument types changed.
- \`sys._getframe()\` inside \`where_am_i\` names its own code object, and \`f_back\` names the caller: frames form a linked chain.

## 8. Edge Cases Worth Knowing

- **\`python -m dis file.py\`** disassembles a whole file from the command line; \`dis.dis(func)\` does one function (and, on 3.11, recurses into nested code objects such as inner functions).
- **\`-B\` or \`PYTHONDONTWRITEBYTECODE=1\`** stops \`.pyc\` writing; **\`-O\`** strips \`assert\` statements and writes \`.opt-1.pyc\` files instead.
- **\`compile()\` has three modes:** \`"exec"\` for a module, \`"eval"\` for one expression, \`"single"\` for one interactive statement (what the REPL uses, which is why the REPL echoes values).
- **\`exec\` and \`eval\` are not slower interpreters**, they just compile a string first. Using them on untrusted input is a security hole, not a performance issue.
- **Comprehensions:** on our 3.11 run a list comprehension compiled to a hidden \`<listcomp>\` function called with \`MAKE_FUNCTION\` and \`CALL\`; 3.12 inlined list, dict and set comprehensions ([PEP 709](https://peps.python.org/pep-0709/)), so \`dis\` output for the same comprehension differs between the two.

## 9. Common Pitfalls

- **Saying "Python is interpreted, so it reads the file line by line".** The whole file is compiled first; that is why a syntax error on line 200 prevents line 1 from running.
- **Thinking \`.pyc\` files speed up execution.** They only skip compilation on import. Deleting \`__pycache__\` costs one recompile, nothing more.
- **Expecting your main script to be cached.** Only imported modules are; move heavy start-up code into a module if compile time matters.
- **Relying on specific bytecode.** Opcodes are added, merged and renamed in almost every release (\`LOAD_FAST_LOAD_FAST\` in 3.13, \`RETURN_CONST\` in 3.12). Anything that reads \`co_code\` directly breaks on upgrade.
- **Believing a \`NameError\` would be caught "at compile time".** The compiler does not check that global names exist; only running the line does. Use a linter or type checker for that.
- **Confusing bytecode with machine code.** Bytecode is input for CPython's C loop, not for your CPU; that extra layer is the main reason pure-Python loops are slower than C.

## 10. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">CPython <strong style="color:#ffca28;">compiles</strong> your source to bytecode first, then a C loop <strong style="color:#ffca28;">interprets</strong> that bytecode on a stack-based virtual machine.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The pipeline:</strong> <span style="color:#f0e2c8;">The tokenizer makes tokens, the parser builds an AST, the compiler produces a code object with bytecode, constants and names, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ceval.c</code> runs it in a frame.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The stack machine:</strong> <span style="color:#f0e2c8;">Instructions like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_FAST</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BINARY_OP</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STORE_FAST</code> push and pop a per-frame value stack; locals are an array indexed by slot, which is why they beat globals.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Caching:</strong> <span style="color:#f0e2c8;">Imported modules are saved as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__pycache__/x.cpython-311.pyc</code>, a 16-byte header plus a marshalled code object; it skips compiling, it does not make the code faster.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. 3.11 and later:</strong> <span style="color:#f0e2c8;">The specializing adaptive interpreter (PEP 659) rewrites hot instructions into typed fast paths like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BINARY_OP_ADD_INT</code>; 3.13 added an experimental, opt-in JIT (PEP 744).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is Python compiled or interpreted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both. Source is compiled to bytecode once per file, and the bytecode is interpreted. Proof: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SyntaxError</code> anywhere stops the file before line 1 runs, while a misspelled global inside a function only fails when that function is called.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dis</code> show, and how do you read a line?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It disassembles a code object: source line, byte offset, opcode name, argument and the meaning of the argument, e.g. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_FAST 0 (a)</code>. Offsets jump by more than 2 where an instruction has inline cache entries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are local variables faster than global ones?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The compiler gives each local a fixed slot in the frame, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_FAST</code> is an array index. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">LOAD_GLOBAL</code> has to look the name up in the module dict and then the builtins dict (3.11 specialises and caches that, but it is still more work).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.pyc</code> file make my program run faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only start-up. It stores the already-compiled code object so import can skip tokenizing, parsing and compiling. The eval loop executes exactly the same bytecode. The main script is not cached at all.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What made CPython 3.11 faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mainly PEP 659: instructions specialise themselves at run time for the types they actually see, using inline caches, and fall back when the guess stops holding. Specialisation is invisible to your program; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dis.dis(f, adaptive=True)</code> shows it.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CPython | The reference Python implementation, written in C |
| Tokenizer (lexer) | Cuts source text into tokens, including INDENT and DEDENT |
| AST | Tree form of the code built by the parser; inspect it with \`ast\` |
| Bytecode | Simple instructions for CPython's virtual machine, not CPU code |
| Code object | Compiled unit: bytecode plus constants, names, locals and stack size |
| Eval loop | The C loop in \`ceval.c\` that fetches and runs bytecode instructions |
| Stack-based virtual machine | A VM whose instructions pop inputs from and push results to a value stack |
| Frame | The state of one running call: code, locals, value stack, position, caller |
| Compile time vs run time | Syntax and slot decisions happen first; name lookups and exceptions happen while running |
| \`.pyc\` file | A cached, marshalled code object for an imported module |
| Specializing adaptive interpreter | 3.11+ rewriting of hot instructions into type-specific fast versions (PEP 659) |

**Conclusion:** CPython never runs your text directly. It tokenizes it, parses it into an AST, compiles that into a code object full of bytecode, optionally caches the result as a \`.pyc\`, and then a C loop executes the bytecode one instruction at a time on a per-call value stack. Knowing that pipeline explains the everyday puzzles — why a syntax error stops the whole file, why locals are faster than globals, why \`.pyc\` files only help start-up — and \`dis\` lets you prove each claim. Mention that bytecode changes between versions and that 3.11 made the loop adapt itself to the types it sees, and you have given the answer at the level an interviewer is hoping for. The next layers down are covered in [memory management and garbage collection](/interview-question/how-does-python-manage-memory-and-garbage-collection), [the import system](/interview-question/how-does-the-python-import-system-work) and [the GIL](/interview-question/what-is-the-global-interpreter-lock-gil).`,
    examples: [
      {
        label: `From source text to bytecode: tokens, AST, code object and dis`,
        code: `import ast
import dis
import importlib.util
import io
import tokenize

source = "total = price * qty + 1\\n"

# Stage 1: the tokenizer cuts the text into tokens
print("== tokens ==")
for tok in tokenize.generate_tokens(io.StringIO(source).readline):
    print(f"{tokenize.tok_name[tok.type]:<10} {tok.string!r}")

# Stage 2: the parser builds an abstract syntax tree (AST)
print("== AST ==")
tree = ast.parse(source)
print(ast.dump(tree.body[0].value))

# Stage 3: the compiler turns the AST into a code object full of bytecode
print("== code object ==")
code = compile(tree, "<demo>", "exec")
print(type(code).__name__)  # code
print(code.co_names)  # ('price', 'qty', 'total')
print(code.co_consts)  # (1, None)
print(len(code.co_code), "bytes of bytecode")
dis.dis(code)

# Stage 4: the interpreter runs the code object against a namespace
namespace = {"price": 20, "qty": 3}
exec(code, namespace)
print("total =", namespace["total"])

# Compiling happens before running: a syntax error anywhere means
# not even line 1 runs
bad = "print('line 1 ran')\\nx = = 2\\n"
try:
    compile(bad, "<bad>", "exec")
except SyntaxError as e:
    print("SyntaxError at compile time, line", e.lineno)

# A NameError, by contrast, is only found when that line executes
lazy = compile("def f():\\n    return undefined_name\\n", "<lazy>", "exec")
ns = {}
exec(lazy, ns)
print("defining f was fine")
try:
    ns["f"]()
except NameError as e:
    print("NameError at run time:", e)

# Where an imported module caches its bytecode
print(importlib.util.cache_from_source("/proj/app/models.py"))`,
      },
      {
        label: `A toy eval loop running real bytecode, plus the adaptive interpreter`,
        code: `import dis
import operator
import sys

def area(width, height):
    border = 2
    return (width + border) * height

# A toy version of the eval loop: one value stack, one array of locals,
# and a loop that dispatches on each instruction name.
BINARY = {"+": operator.add, "*": operator.mul, "-": operator.sub}

def toy_eval(func, *args):
    code = func.__code__
    local_vars = list(args) + [None] * (code.co_nlocals - len(args))
    stack = []
    for ins in dis.get_instructions(func):
        op = ins.opname
        if op == "RESUME":
            continue
        elif op == "LOAD_FAST":
            stack.append(local_vars[ins.arg])
        elif op == "LOAD_CONST":
            stack.append(code.co_consts[ins.arg])
        elif op == "STORE_FAST":
            local_vars[ins.arg] = stack.pop()
        elif op == "BINARY_OP":
            right = stack.pop()
            left = stack.pop()
            stack.append(BINARY[ins.argrepr](left, right))
        elif op == "RETURN_VALUE":
            return stack.pop()
        else:
            raise NotImplementedError(op)
        print(f"{op:<12} {ins.argrepr:<7} stack={stack}")

print("real :", area(3, 4))
print("toy  :", toy_eval(area, 3, 4))

# The 3.11+ specializing adaptive interpreter rewrites hot instructions
def add(a, b):
    return a + b

def binary_op_names(func):
    return [i.opname for i in dis.get_instructions(func, adaptive=True)
            if i.opname.startswith("BINARY_OP")]

print("cold        :", binary_op_names(add))
for i in range(100):
    add(i, 1)
print("after ints  :", binary_op_names(add))
for i in range(100):
    add("x", "y")
print("after strs  :", binary_op_names(add))

# Each call runs in its own frame object
def where_am_i():
    frame = sys._getframe()
    return frame.f_code.co_name, frame.f_back.f_code.co_name

def caller():
    return where_am_i()

print(caller())  # ('where_am_i', 'caller')`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `Why does Python cache small integers?`,
    difficulty: "medium",
    seoDescription: `CPython preallocates the ints -5 to 256 and reuses them. Why it does, how to prove it, the constant-sharing traps around is, and 3.12 immortal objects.`,
    description: `**Question presented to candidate:**
"In CPython, \`a = 256; b = 256; a is b\` gives \`True\`, but the same thing with numbers built at run time above 256 gives \`False\`. Why does Python cache small integers, which ones, and what does that mean for code that uses \`is\` on numbers?"

**What a strong answer should cover:**
- CPython preallocates one object for every int from **-5 to 256** at start-up and returns that shared object whenever such a value is produced, by a literal, by \`int("7")\` or by arithmetic
- The reason: small ints are by far the most common values (indexes, counters, lengths, flags), and an int object is a full heap object (28 bytes on a 64-bit build), so sharing saves allocations, frees and memory; it is safe only because ints are **immutable**
- It is an implementation detail of CPython, not a language guarantee; the range is a compile-time constant (\`_PY_NSMALLNEGINTS = 5\`, \`_PY_NSMALLPOSINTS = 257\` in the 3.11-3.13 headers)
- Separate trap: equal constants inside one compiled unit are stored once, so \`x = 1000; y = 1000; x is y\` can be \`True\` in a script and \`False\` typed line by line in the REPL; constant folding (\`999 + 1\`) joins in
- \`is\` on numbers is a bug: compare values with \`==\`; CPython 3.8+ even emits \`SyntaxWarning: "is" with a literal\`
- Since 3.12 (PEP 683) small ints, \`None\`, \`True\` and \`False\` are **immortal**: their reference count is pinned and never changes

**Code / implementation expected:** Optional — showing the boundary with \`int(str(n))\` and explaining why literals mislead is the strong version.`,
    answer: `**Target Audience:** Python developers who know what a variable is and have seen \`is\` and \`==\`. No knowledge of CPython's C code is needed.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (64-bit), with 3.12 and 3.13 where they differ. Examples 1 and 2 also run in the page on Pyodide 0.25.1 (CPython 3.11.3); Example 3 needs 3.12+.

> **How to read this doc:** Each idea is explained in plain words first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined on the spot. All of them are collected in the Quick Glossary at the end. Every output shown was produced by running the code.

## 1. Why This Even Matters — A Story First

A café hands out numbered tickets so customers know when their coffee is ready. They could print a fresh paper ticket for every customer, write the number on it, and shred it afterwards. But tickets 1 to 50 come up all day long. So the café laminates one plastic ticket for each of those numbers and hands the same laminated "7" to whoever is seventh, then gets it back and hands it out again. Big numbers, like the "4,812" for a catering order, are rare, so those still get a fresh paper ticket.

That works only because nobody writes on a ticket: if a customer could scribble on the laminated 7, the next customer would get a changed ticket.

CPython does the same with integers. **The numbers from -5 to 256 are laminated tickets**: one object each, made when the interpreter starts and shared by everyone. Bigger numbers get a fresh object each time they are computed. Ints can never be changed in place, so sharing is invisible — unless you ask "is this the *same* ticket?" with \`is\`. That is where the interview question comes from.

## 2. What an int Costs, and Why Sharing Is Safe

📌 **Interview term: Everything is an object** — in CPython even the number \`7\` is a heap-allocated C struct (\`PyLongObject\`) with a reference count, a pointer to its type, and its digits. On a 64-bit build \`sys.getsizeof(1)\` is 28 bytes on our run. (In the page's 32-bit WebAssembly build of Python the same call says 16, so the examples never print sizes.)

📌 **Interview term: Immutable** — an object whose value can never change after creation. Ints, floats, strings and tuples are immutable; \`x += 1\` makes \`x\` point to a *different* int object. See [mutable and immutable types](/interview-question/what-are-mutable-and-immutable-types-in-python).

Because every int is an object, a loop like \`for i in range(1000)\` would, without a cache, create and destroy objects constantly: \`len()\` results, list indexes, counters, the \`0\` and \`1\` your code uses everywhere. Because ints are immutable, handing everybody the same \`0\` object can never cause one part of a program to see another part's changes. Put those two facts together and you get the cache.

📌 **Interview term: Small integer cache** — the array of preallocated int objects for **-5 through 256** that CPython keeps for the lifetime of the interpreter. Any operation that produces one of those values returns the shared object instead of allocating a new one.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 260" role="img" aria-label="Variables a and b both point to the one cached object for 256, while c and d point to two separate objects for 257">
  <defs>
    <marker id="py22q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="200" y="30" text-anchor="middle">inside the cache</text>
  <text class="d-sub" x="640" y="30" text-anchor="middle">outside the cache</text>
  <rect class="d-box-muted" x="60" y="60" width="90" height="44" rx="8"/>
  <text class="d-text" x="105" y="88" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="250" y="60" width="90" height="44" rx="8"/>
  <text class="d-text" x="295" y="88" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="120" y="170" width="160" height="60" rx="8"/>
  <text class="d-text" x="200" y="198" text-anchor="middle">int 256</text>
  <text class="d-sub" x="200" y="218" text-anchor="middle">one shared object</text>
  <path class="d-edge-accent" d="M 105 106 L 170 166" marker-end="url(#py22q2-arrow)"/>
  <path class="d-edge-accent" d="M 295 106 L 230 166" marker-end="url(#py22q2-arrow)"/>
  <rect class="d-box-muted" x="495" y="60" width="90" height="44" rx="8"/>
  <text class="d-text" x="540" y="88" text-anchor="middle">c</text>
  <rect class="d-box-muted" x="695" y="60" width="90" height="44" rx="8"/>
  <text class="d-text" x="740" y="88" text-anchor="middle">d</text>
  <rect class="d-box" x="470" y="170" width="140" height="60" rx="8"/>
  <text class="d-text" x="540" y="198" text-anchor="middle">int 257</text>
  <text class="d-sub" x="540" y="218" text-anchor="middle">new object</text>
  <rect class="d-box" x="670" y="170" width="140" height="60" rx="8"/>
  <text class="d-text" x="740" y="198" text-anchor="middle">int 257</text>
  <text class="d-sub" x="740" y="218" text-anchor="middle">another one</text>
  <path class="d-edge" d="M 540 106 L 540 166" marker-end="url(#py22q2-arrow)"/>
  <path class="d-edge" d="M 740 106 L 740 166" marker-end="url(#py22q2-arrow)"/>
</svg>

On the left, both names refer to the one cached \`256\`, so \`a is b\` is \`True\`. On the right, each computation of 257 built its own object: equal values, different identities, so \`c is d\` is \`False\` while \`c == d\` is \`True\`.

📌 **Interview term: Identity vs equality** — \`a is b\` asks "are these the same object?" (same \`id()\`); \`a == b\` asks "do these have the same value?" (calls \`__eq__\`). Full details in [the difference between == and is](/interview-question/what-is-the-difference-between-and-is).

## 3. Proving the Range

You cannot test the cache with literals (section 4 explains why), so Example 1 builds each number at run time with \`int(str(n))\` and asks whether two separate builds give the same object:

~~~python
def fresh(n):
    return int(str(n))

cached = [n for n in range(-20, 400) if fresh(n) is fresh(n)]
~~~

~~~text
cached range: -5 to 256
how many: 262
~~~

262 values: 5 negatives, zero, and 256 positives. The same range printed on 3.12 and 3.13.

Where the numbers come from: CPython's internal header \`pycore_global_objects.h\` (3.11, 3.12 and 3.13 on our machine) defines

~~~text
#define _PY_NSMALLPOSINTS           257
#define _PY_NSMALLNEGINTS           5
~~~

and the comment above the array says the preallocated ints are those "in the range -_PY_NSMALLNEGINTS (inclusive) to _PY_NSMALLPOSINTS (exclusive)". In 3.11 the array lives in a global structure (\`_PyRuntime.global_objects.singletons.small_ints\`), built into the interpreter rather than allocated one by one. The neighbouring header \`pycore_long.h\` refuses to compile if \`_PY_NSMALLPOSINTS\` is below 257, with the comment that zero, one and every unsigned byte value must "always be available" from the cache. So 256 is not an accident: it covers every byte value 0 to 255 (handy for \`bytes\` indexing) plus a little.

Why not cache more? Each cached int is memory held forever, and the payoff drops quickly: values like 0, 1, -1 and small indexes dominate real programs. A few hundred objects is the trade-off the CPython developers chose; it is not configurable without rebuilding Python.

## 4. The \`is\` Traps That Make This Confusing

Most people discover the cache through a surprising \`is\` result. Three different mechanisms are involved, and only the first is the cache. Example 2 shows each:

~~~text
same module, 1000 is 1000: True
module vs function: True
separate compiles, 1000: False
separate compiles, 100:  True
co_consts: (1000, None)
1000 is 999 + 1: True
~~~

**Trap 1: constants are shared inside one compilation.** When CPython compiles a file, every literal becomes an entry in the code object's \`co_consts\` tuple, and the compiler stores equal constants once — even across the module and the functions defined in it (that is the \`module vs function: True\` line). So in a script, \`a = 1000; b = 1000; a is b\` is \`True\` even though 1000 is far outside the cache.

📌 **Interview term: Constant table (\`co_consts\`)** — the tuple of literal values a code object uses; \`LOAD_CONST i\` pushes entry \`i\`. See [how CPython executes your code](/interview-question/how-does-cpython-execute-your-code).

**Trap 2: the REPL compiles each line separately.** Typed at the interactive prompt, \`a = 1000\` and \`b = 1000\` are two compilations with two constant tables, so they produce two objects and \`a is b\` is \`False\`. Example 2 imitates the REPL with two \`exec()\` calls: \`1000\` gives \`False\`, \`100\` still gives \`True\` because the cache catches it. This is why the same snippet "behaves differently" in a script and in the REPL.

**Trap 3: constant folding.** The compiler evaluates \`999 + 1\` at compile time, so the module's \`co_consts\` is just \`(1000, None)\` and both names load the same constant.

📌 **Interview term: Constant folding** — the compiler optimisation that computes expressions made only of constants (\`999 + 1\`, \`2 ** 10\`, \`"ab" + "cd"\`) once at compile time and stores the result as a constant.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 220" role="img" aria-label="Three sources of identical int objects: the small int cache, shared constants in one code object, and constant folding">
  <rect class="d-box-accent" x="20" y="40" width="240" height="120" rx="10"/>
  <text class="d-text" x="140" y="78" text-anchor="middle">small int cache</text>
  <text class="d-sub" x="140" y="106" text-anchor="middle">-5 to 256 only</text>
  <text class="d-sub" x="140" y="130" text-anchor="middle">any way the value is made</text>
  <rect class="d-box" x="310" y="40" width="240" height="120" rx="10"/>
  <text class="d-text" x="430" y="78" text-anchor="middle">shared constants</text>
  <text class="d-sub" x="430" y="106" text-anchor="middle">any size of literal</text>
  <text class="d-sub" x="430" y="130" text-anchor="middle">same compile only</text>
  <rect class="d-box" x="600" y="40" width="240" height="120" rx="10"/>
  <text class="d-text" x="720" y="78" text-anchor="middle">constant folding</text>
  <text class="d-sub" x="720" y="106" text-anchor="middle">999 + 1 becomes 1000</text>
  <text class="d-sub" x="720" y="130" text-anchor="middle">at compile time</text>
</svg>

Only the first box is a run-time promise (within CPython); the other two depend on how the code happened to be compiled. None of them is something your program should rely on.

**The compiler warns you.** Since Python 3.8 ([bpo-34850](https://bugs.python.org/issue34850), explained in [this write-up](https://adamj.eu/tech/2020/01/21/why-does-python-3-8-syntaxwarning-for-is-literal/)), comparing with \`is\` against a literal triggers a warning at compile time. Example 2 captures it:

~~~text
SyntaxWarning: "is" with a literal. Did you mean "=="?
~~~

On 3.12 and 3.13 the wording on our runs was slightly more specific: \`"is" with 'int' literal. Did you mean "=="?\`.

## 5. The Cache in Action: Arithmetic, Memory and Reference Counts

The cache is not about literals at all; it sits inside the functions that create ints. From Example 1:

~~~text
distinct objects for 100:     1
distinct objects for 100_000: 10000
256 True
300 False
~~~

- A list of 10,000 values of \`100\` built at run time holds 10,000 references to **one** object. The same list of \`100_000\` holds 10,000 separate objects — on a 64-bit build that is 10,000 × 28 = 280,000 bytes of int objects that the cached version never allocates.
- \`200 + 56\`, computed from two run-time values, returns the cached \`256\`. \`100 * 3 = 300\` returns a fresh object.

📌 **Interview term: Reference count** — the counter in every CPython object that tracks how many references point at it; the object is freed when it drops to zero. See [memory management and garbage collection](/interview-question/how-does-python-manage-memory-and-garbage-collection).

Every cached int is referenced from all over the interpreter, so its count is enormous. In 3.11 the cached ints start with a reference count of \`999999999\` (the \`_PyObject_IMMORTAL_INIT\` macro in \`pycore_object.h\`), which is why Example 1's \`sys.getrefcount(fresh(1)) > 10**8\` prints \`True\`. They are still ordinary counted objects in 3.11: the number goes up and down as references come and go.

### Immortal objects in 3.12+

📌 **Interview term: Immortal object** — an object whose reference count is pinned to a special value and is never changed or freed while the interpreter runs. Introduced by [PEP 683](https://peps.python.org/pep-0683/) in Python 3.12. Small ints, \`None\`, \`True\`, \`False\` and other core singletons are immortal.

In the 3.12 header \`object.h\`, the immortal count on 64-bit builds is \`_Py_IMMORTAL_REFCNT UINT_MAX\` (2**32 - 1); increments use saturated arithmetic, so they never move it. Example 3, run on 3.12, makes 1,000 new references to \`1\` and to \`123456\`:

~~~text
True
small int 1   : True True
big int 123456: 1000
True
~~~

The small int's count did not move and equals \`2**32 - 1\`; the big int's count rose by exactly 1,000. The same program on 3.11 printed \`False\` for every check, because 3.11 has no immortal objects. Why bother? Shared objects that never write to their own header do not bounce CPU cache lines between cores, and they are a building block for the [per-interpreter GIL and free threading](/interview-question/what-is-python-3-12-s-free-threaded-no-gil-build-and-what-changes).

## 6. Verified: Running the Code

Example 1 (the range, what the cache saves, arithmetic and reference counts), in the page and on python3.11:

~~~text
cached range: -5 to 256
how many: 262
True True
False True
distinct objects for 100:     1
distinct objects for 100_000: 10000
256 True
300 False
True
True True True
False
~~~

Example 2 (shared constants, the REPL imitation, constant folding and the warning):

~~~text
same module, 1000 is 1000: True
module vs function: True
separate compiles, 1000: False
separate compiles, 100:  True
co_consts: (1000, None)
1000 is 999 + 1: True
SyntaxWarning: "is" with a literal. Did you mean "=="?
True
~~~

Example 3 is marked "runs on 3.12" because Pyodide is 3.11; its 3.12 output is quoted in section 5.

What the output proves:

- The cache boundary is exactly -5 and 256 on CPython 3.11, 3.12 and 3.13.
- \`fresh(1) is True\` is \`False\` even though \`True == 1\`: \`bool\` is a subclass of \`int\`, but \`True\` is its own singleton, not the cached \`1\`.
- Large literals look "cached" inside one compiled unit (\`True\`) and not across separate compilations (\`False\`): that is the constant table, not the cache.
- \`==\` gives the right answer in every case.

## 7. Edge Cases

- **Other implementations have their own rules.** PyPy, for example, documents its own behaviour for the identity of primitive values in [its list of differences from CPython](https://doc.pypy.org/en/latest/cpython_differences.html). The language only promises that \`is\` checks identity; which equal values are the same object is up to the implementation.
- **\`-6\` is not cached, but \`-5\` is.** The negative side is short because negative indexes like \`-1\` are common, and big negative numbers are not.
- **Floats are not cached.** \`float("1.0") is float("1.0")\` is \`False\`; only constant sharing can make two equal floats identical.
- **\`bool\` results are always singletons.** Any comparison returns the one \`True\` or the one \`False\`, which is why \`x is True\` "works" (PEP 8 still recommends plain \`if x:\`).
- **Do not use \`id()\` as a value key for numbers.** Two different 257s have different ids while alive, and a freed object's id can be reused by a new one.

## 8. Common Pitfalls

- **Using \`is\` to compare numbers.** It "works" for small values and in scripts, then fails in production for 257 or for values read from a file. Always use \`==\`.
- **Testing the cache with literals.** \`1000 is 1000\` in a script is \`True\` because of shared constants; build values at run time with \`int(str(n))\` to see the real behaviour.
- **Believing the range is part of the language.** It is a CPython build constant, not in the Python specification; another implementation or a future version may change it.
- **Explaining the cache as "an optimisation for speed" only.** The bigger point is that it is *safe* because ints are immutable; a cache of mutable objects would leak changes between unrelated code.
- **Thinking \`sys.getrefcount\` on a small int tells you something.** On 3.11 it is near 10**9 and on 3.12+ it is a fixed sentinel; it says nothing about your own references.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">CPython preallocates one object for each int from <strong style="color:#ffca28;">-5 to 256</strong> and hands out that shared object whenever such a value is produced, so small ints are never allocated or freed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why:</strong> <span style="color:#f0e2c8;">Ints are full heap objects (28 bytes on 64-bit), small values are everywhere, and sharing is <strong style="color:#ffca28;">safe because ints are immutable</strong>: nobody can change the shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">7</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How you see it:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int("256") is int("256")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int("257") is int("257")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>; arithmetic results such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">200 + 56</code> also come from the cache.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The confusing part:</strong> <span style="color:#f0e2c8;">Inside one compiled file equal literals are stored once in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">co_consts</code> and constants are folded, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1000 is 1000</code> can be <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> in a script and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> in the REPL. That is not the cache.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The rule and the 3.12 detail:</strong> <span style="color:#f0e2c8;">Never use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> on numbers, use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> (the compiler warns since 3.8). Since 3.12, PEP 683 made small ints, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> immortal with a pinned reference count.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why exactly -5 to 256?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a build constant: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_PY_NSMALLNEGINTS = 5</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">_PY_NSMALLPOSINTS = 257</code> in CPython's internal headers. A header check requires at least 257 so that 0, 1 and every byte value 0 to 255 always come from the cache. Small negatives cover <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-1</code> style indexes. Beyond that the memory cost outweighs the hit rate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a is b</code> True for 1000 in my script but False in the REPL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In a script both literals are compiled together and stored once in the code object constant table, so both names load the same object. The REPL compiles each line separately, creating two objects. Only -5 to 256 are shared no matter how they were created.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it guaranteed by the language?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is a CPython implementation detail. The language only defines that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> compares identity; which equal values happen to be the same object is up to the implementation and version.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Are other values cached like this?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">...</code> and the empty tuple are singletons. Some strings are interned. Floats are not cached at all, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float("1.0") is float("1.0")</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed in Python 3.12?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Immortal objects (PEP 683). Small ints and other core singletons got a fixed reference count (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2**32 - 1</code> on 64-bit) that increments and decrements do not change, so the objects are never written to by refcounting. That helps CPU caches and is groundwork for per-interpreter GILs and free threading.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Everything is an object | Even small numbers are heap objects with a refcount and a type pointer |
| Immutable | Cannot change after creation; makes sharing one object safe |
| Small integer cache | CPython keeps one object for each int from -5 to 256 for the whole run |
| Identity vs equality | \`is\` compares objects, \`==\` compares values |
| Constant table (\`co_consts\`) | The literals a code object uses, stored once per compile |
| Constant folding | Computing constant expressions such as \`999 + 1\` at compile time |
| Reference count | Per-object counter of references; the object is freed at zero |
| Immortal object | 3.12+ object whose refcount is pinned and never changes (PEP 683) |

**Conclusion:** CPython caches -5 to 256 because those values are everywhere and every int is a full heap object, and it can afford to share them only because ints are immutable. The cache itself is easy to prove with values built at run time; most of the confusion comes from two unrelated compiler behaviours, shared constants and constant folding, that make large literals look cached in scripts but not in the REPL. The practical rule falls out of all of it: \`is\` asks about identity, which is an implementation detail for numbers, so compare numbers with \`==\`. Close with the 3.12 detail — small ints became immortal under PEP 683 — and you have covered the question end to end. The string version of the same idea is [string interning](/interview-question/what-is-string-interning-in-python).`,
    examples: [
      {
        label: `Finding the cached range and what the cache saves`,
        code: `import sys

# int(str(n)) builds a brand-new int at run time, so the compiler
# cannot share constants for us. Two such calls give the same object
# only when CPython hands back a cached one.
def fresh(n):
    return int(str(n))

cached = [n for n in range(-20, 400) if fresh(n) is fresh(n)]
print("cached range:", cached[0], "to", cached[-1])
print("how many:", len(cached))

a = fresh(256)
b = fresh(256)
print(a is b, a == b)  # True True
c = fresh(257)
d = fresh(257)
print(c is d, c == d)  # False True

# What the cache buys: one shared object instead of many
small = [fresh(100) for _ in range(10_000)]
big = [fresh(100_000) for _ in range(10_000)]
print("distinct objects for 100:    ", len({id(x) for x in small}))
print("distinct objects for 100_000:", len({id(x) for x in big}))

# Arithmetic results are cached too, not just literals
total = fresh(200) + fresh(56)
print(total, total is fresh(256))
product = fresh(100) * 3
print(product, product is fresh(300))

# Every cached int is shared by the whole interpreter, so its
# reference count is huge (3.11 starts it near 10**9)
print(sys.getrefcount(fresh(1)) > 10**8)  # True

# bool is a subclass of int; True and False are singletons as well
print(isinstance(True, int), True == 1, True is (1 == 1))
print(fresh(1) is True)  # False`,
      },
      {
        label: `The is traps: shared constants, the REPL and constant folding`,
        code: `import warnings

# Gotcha 1: inside ONE code object, equal constants are stored once,
# so big literals can look cached when they are not.
a = 1000
b = 1000
print("same module, 1000 is 1000:", a is b)

def make():
    return 1000

print("module vs function:", a is make())

# Gotcha 2: the REPL compiles every line separately. exec() of two
# separate strings imitates that.
ns = {}
exec("x = 1000", ns)
exec("y = 1000", ns)
print("separate compiles, 1000:", ns["x"] is ns["y"])
exec("p = 100", ns)
exec("q = 100", ns)
print("separate compiles, 100: ", ns["p"] is ns["q"])

# Gotcha 3: constant folding computes 999 + 1 at compile time,
# so it becomes the same stored constant as 1000
code = compile("n = 1000\\nm = 999 + 1\\n", "<fold>", "exec")
print("co_consts:", code.co_consts)
ns2 = {}
exec(code, ns2)
print("1000 is 999 + 1:", ns2["n"] is ns2["m"])

# The compiler itself warns when you use is with a literal
with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    compile("value is 5", "<check>", "eval")
print(caught[0].category.__name__ + ":", caught[0].message)

# The rule that always holds: == compares values
print(ns["x"] == ns["y"])  # True`,
      },
      {
        label: `Immortal small ints on CPython 3.12+`,
        code: `import sys

# Run on CPython 3.12+ (64-bit). PEP 683 made small ints immortal:
# their reference count is pinned and never changes.
print(sys.version_info >= (3, 12))

one = int("1")
before = sys.getrefcount(one)
refs = [one] * 1000
after = sys.getrefcount(one)
print("small int 1   :", before == after, before == 2**32 - 1)

big = int("123456")
before = sys.getrefcount(big)
refs = [big] * 1000
after = sys.getrefcount(big)
print("big int 123456:", after - before)

# None, True, False and small ints share the same pinned count
print(sys.getrefcount(None) == sys.getrefcount(True) == 2**32 - 1)`,
        runnable: false,
        python: "3.12",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is string interning in Python?`,
    difficulty: "medium",
    seoDescription: `String interning in Python: which literals CPython interns automatically, sys.intern, why it speeds up dict lookups and saves memory, and the is trap.`,
    description: `**Question presented to candidate:**
"Sometimes two equal strings in Python are the same object and sometimes they are not. What is string interning, which strings does CPython intern on its own, when would you call \`sys.intern\` yourself, and why is comparing strings with \`is\` still a mistake?"

**What a strong answer should cover:**
- Interning means keeping **one canonical object per distinct string value** in an interpreter-wide table and reusing it, so equal interned strings are also identical (\`is\`)
- CPython interns automatically: identifiers (variable, function, attribute and keyword-argument names), string constants that look like identifiers (ASCII letters, digits, underscore), the empty string, and attribute names passed to \`setattr\`/\`getattr\`; it does **not** intern strings built at run time, read from files or with spaces/punctuation/non-ASCII
- Why: dict lookups compare by identity before calling \`__eq__\` and strings cache their hash, so interned keys (namespaces, \`__dict__\`, keyword arguments) are found with a pointer comparison; it also saves memory for repeated values
- \`sys.intern(s)\` returns the canonical copy; useful when the same few strings are repeated a huge number of times (parsed logs, CSV columns, tokens), with the cost of one hash lookup per call
- It is a CPython implementation detail: compare strings with \`==\`; \`is\` works only by accident and the compiler warns about \`is\` with a literal

**Code / implementation expected:** Optional — demonstrating a run-time-built string that is equal but not identical, and fixing it with \`sys.intern\`.`,
    answer: `**Target Audience:** Python developers who know strings, dictionaries and the difference between \`==\` and \`is\`. No C knowledge is needed.
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (and repeated on 3.12 and 3.13 where noted). Both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Every idea is explained in plain words first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined on the spot. All of them are collected in the Quick Glossary at the end. Every output shown was produced by running the code.

## 1. Why This Even Matters — A Story First

A big office building has a reception desk that prints visitor badges. On a normal day a thousand people come in, but almost all of them are visiting one of five departments: "Sales", "Legal", "IT", "HR", "Finance". The receptionist could print a brand-new "Sales" sticker for every Sales visitor. Or she could keep one master stamp per department name and stamp it, so every Sales badge comes from the same stamp. Security at the lift then does not need to read the badge letter by letter: "is it the Sales stamp?" is a glance.

**String interning is the master-stamp drawer.** Python keeps a table of strings it has decided to share. When a string is interned, every place that needs that text gets the *same* object, so checking "is this the name \`count\`?" can be a pointer comparison instead of comparing characters. Python does this constantly for the names in your code, which is a big part of why attribute and variable lookups are fast. Interviewers ask about it because it explains a classic puzzle (why \`a is b\` is sometimes \`True\` for strings), it tests whether you understand identity versus equality, and \`sys.intern\` is a real, if niche, memory optimisation.

## 2. What Interning Is

📌 **Interview term: String interning** — storing exactly one object for each distinct string value in a shared table, and returning that object whenever the same value is interned again. Two interned strings with equal text are always the same object.

📌 **Interview term: Intern table** — CPython's interpreter-wide dictionary of interned strings. Interning a string means "look it up in the table; if it is there, return the stored object, otherwise store this one and return it".

📌 **Interview term: Identity vs equality** — \`a is b\` is true only when both names refer to one object; \`a == b\` is true when the values are equal. Interning turns equality into identity for the strings it covers. See [== vs is](/interview-question/what-is-the-difference-between-and-is).

<svg class="iq-diagram" width="100%" viewBox="0 0 860 280" role="img" aria-label="Two run time strings with the text ERROR are separate objects until sys.intern returns the one stored copy from the intern table">
  <defs>
    <marker id="py22q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-sub" x="190" y="30" text-anchor="middle">built at run time</text>
  <text class="d-sub" x="660" y="30" text-anchor="middle">after sys.intern</text>
  <rect class="d-box-muted" x="40" y="60" width="130" height="50" rx="8"/>
  <text class="d-text" x="105" y="90" text-anchor="middle">a = ERROR</text>
  <rect class="d-box-muted" x="210" y="60" width="130" height="50" rx="8"/>
  <text class="d-text" x="275" y="90" text-anchor="middle">b = ERROR</text>
  <text class="d-sub" x="190" y="160" text-anchor="middle">two objects, a is b is False</text>
  <rect class="d-box-muted" x="510" y="60" width="130" height="50" rx="8"/>
  <text class="d-text" x="575" y="90" text-anchor="middle">a</text>
  <rect class="d-box-muted" x="680" y="60" width="130" height="50" rx="8"/>
  <text class="d-text" x="745" y="90" text-anchor="middle">b</text>
  <rect class="d-box-accent" x="560" y="190" width="200" height="60" rx="8"/>
  <text class="d-text" x="660" y="218" text-anchor="middle">ERROR</text>
  <text class="d-sub" x="660" y="238" text-anchor="middle">the one copy in the table</text>
  <path class="d-edge-accent" d="M 575 112 L 630 186" marker-end="url(#py22q3-arrow)"/>
  <path class="d-edge-accent" d="M 745 112 L 690 186" marker-end="url(#py22q3-arrow)"/>
</svg>

Interning never changes the text, only how many objects carry it. That is safe only because strings are [immutable](/interview-question/what-are-mutable-and-immutable-types-in-python): nobody can edit the shared copy behind your back.

## 3. What CPython Interns Without Being Asked

Example 1 compiles the same literal in two separate \`exec()\` calls, which is what happens when two different modules (or two REPL lines) use the same text, and checks whether both produced one object:

~~~text
"user_id"       interned: True
"hello"         interned: True
"x1"            interned: True
"hello world"   interned: False
"hello!"        interned: False
"café"          interned: False
""              interned: True
"ab" + "cd"     interned: True
~~~

The pattern, which printed identically on 3.11, 3.12 and 3.13:

- **Literals made only of ASCII letters, digits and underscores are interned.** They look like identifiers, and they very often *are* used as names: \`getattr(obj, "user_id")\`, \`**{"user_id": 1}\`, \`d["status"]\`.
- **Literals with a space, punctuation or non-ASCII characters are not.** \`"hello world"\` and \`"café"\` are kept as ordinary constants.
- **The empty string is a singleton.**
- **Constant folding happens first:** \`"ab" + "cd"\` is computed at compile time to \`"abcd"\`, which looks like an identifier, so it is interned. (On our 3.11 run the compiler folded \`"x" * 4096\` but left \`"x" * 4097\` as a multiplication to do at run time.)

📌 **Interview term: Identifier** — a name in code: a variable, function, class, attribute, parameter or keyword-argument name. CPython interns **all** of them, since it compares them constantly. The names stored in a code object's \`co_names\` and \`co_varnames\` are interned: on our 3.11 run, \`compile("foo_bar = 1", ...).co_names[0] is sys.intern("foo" + "_bar")\` was \`True\`.

### What is not interned

~~~text
built at run time: True False
after sys.intern:  True True
~~~

Strings you **build while the program runs** — \`"".join(...)\`, \`+\`, slicing, f-strings, \`str(n)\`, \`.decode()\`, lines read from a file, JSON values — are ordinary new objects. Two of them with the same text are \`==\` but not \`is\`, until you pass them through \`sys.intern\`.

Two interesting exceptions that also come from Example 1 and our runs:

- \`setattr(cfg, "".join(["time", "out"]), 30)\` stored an interned key in \`cfg.__dict__\` (\`True\` in Example 1): attribute names are interned when they are set, because they will be looked up as names.
- A plain dict key built at run time is **not** interned (\`False\`).

📌 **Interview term: \`sys.intern(s)\`** — returns the canonical interned copy of the string \`s\`, adding \`s\` to the table if the value is new. The first object interned for a value wins; later calls with equal text return that first object (Example 1: \`again is first\` is \`True\`). It accepts only \`str\`; Example 1 shows \`TypeError: intern() argument must be str, not bytes\`.

## 4. Why Bother? Faster Lookups and Less Memory

### Lookups: identity before equality

When a dict looks up a key, it finds the slot by hash, and then asks "is the stored key the *same object* as the one I am looking for?" Only if they are different objects does it call \`==\`. Example 2 proves the order with a key class that counts its \`__eq__\` calls:

~~~text
same object, __eq__ calls: 0
equal copy,  __eq__ calls: 1
~~~

Strings add one more shortcut: every \`str\` object caches its hash after the first time it is computed (the \`hash\` field in CPython's \`PyASCIIObject\` struct, "-1 if not set" per the header comment). So looking up an interned string key costs a cached hash plus one pointer comparison — no character-by-character comparison at all.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 250" role="img" aria-label="Dict lookup path: hash finds the slot, an identity check succeeds at once for interned keys, otherwise the slower equality check compares characters">
  <defs>
    <marker id="py22q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="90" width="180" height="70" rx="8"/>
  <text class="d-text" x="110" y="120" text-anchor="middle">hash(key)</text>
  <text class="d-sub" x="110" y="142" text-anchor="middle">cached in the str</text>
  <rect class="d-box" x="280" y="90" width="180" height="70" rx="8"/>
  <text class="d-text" x="370" y="120" text-anchor="middle">stored is key</text>
  <text class="d-sub" x="370" y="142" text-anchor="middle">pointer compare</text>
  <rect class="d-box-accent" x="560" y="20" width="260" height="70" rx="8"/>
  <text class="d-text" x="690" y="50" text-anchor="middle">found</text>
  <text class="d-sub" x="690" y="72" text-anchor="middle">interned keys stop here</text>
  <rect class="d-box-muted" x="560" y="160" width="260" height="70" rx="8"/>
  <text class="d-text" x="690" y="190" text-anchor="middle">stored == key</text>
  <text class="d-sub" x="690" y="212" text-anchor="middle">compare characters</text>
  <path class="d-edge" d="M 202 125 L 276 125" marker-end="url(#py22q3-arrow2)"/>
  <path class="d-edge-accent" d="M 462 110 L 556 60" marker-end="url(#py22q3-arrow2)"/>
  <text class="d-sub" x="490" y="66" text-anchor="middle">yes</text>
  <path class="d-edge-dashed" d="M 462 140 L 556 190" marker-end="url(#py22q3-arrow2)"/>
  <text class="d-sub" x="490" y="196" text-anchor="middle">no</text>
</svg>

This is the main reason CPython interns identifiers. Every global lookup, attribute access and keyword argument is a dict lookup with a string key: \`obj.timeout\` looks up \`"timeout"\` in \`obj.__dict__\`. The name in your code (\`co_names\`) is interned, and the key stored in \`__dict__\` was interned by \`setattr\`, so the lookup is almost always an identity hit. For how the dict itself works, see [how dictionaries are implemented](/interview-question/how-are-python-dictionaries-implemented-and-ordered); the identity-before-equality rule is also part of [the __hash__ and __eq__ contract](/interview-question/what-is-the-hash-and-eq-contract).

### Memory: deduplicating repeated text

Example 2 builds 30,000 log levels the way a parser would (slicing and joining makes new strings):

~~~text
distinct objects, plain:    30000
distinct objects, interned: 3
~~~

Without interning there are 30,000 string objects holding three distinct values; with \`sys.intern\` there are three. On our 64-bit 3.11 run \`sys.getsizeof("ERROR")\` was 54 bytes, so the plain list carries roughly 1.6 MB of duplicate string objects that the interned list does not. The lists still compare equal (\`True\`), because interning never changes values.

📌 **Interview term: Deduplication** — replacing many equal objects with references to one shared object. \`sys.intern\` is the standard-library way to deduplicate strings.

Related trick: \`json.loads\` already shares repeated *keys* within one call. On our 3.11 run, the \`"key_a"\` key of two objects in one JSON array was the same object, though it was not in the intern table.

## 5. When to Call \`sys.intern\` Yourself

Good uses:

- **Few distinct values, huge numbers of repeats**: log levels, country codes, column names, tokens in a parser, symbol names in an interpreter you are writing.
- **Strings used as dict keys in hot loops**, for example keys parsed from a protocol that are looked up millions of times.

Costs and limits:

- **Each \`sys.intern\` call is a hash plus a table lookup.** For strings that are mostly unique it costs time and gains nothing.
- **Only \`str\`.** Not \`bytes\`, not subclasses of \`str\` you might pass by mistake in older code paths.
- **Do not intern unbounded user input** without thought: every distinct value goes into an interpreter-wide table, and whether it can ever leave depends on the version. We interned a fresh run-time string and printed \`sys.getrefcount\` on it: **2 on 3.11 and 3.13**, meaning the table's own reference is not counted (the 3.11 header comment says those references "are *not* counted in ob_refcnt"), so the string is freed when your last reference goes. On **3.12 it printed 4294967295**, the immortal sentinel: on our 3.12 run every interned string became immortal, so interning millions of unique strings there keeps them all alive until the process exits.

### Internals worth one sentence each

- **The state lives in the string itself.** CPython's \`PyASCIIObject\` has a 2-bit \`interned\` field. In 3.11 its values are \`SSTATE_NOT_INTERNED\`, \`SSTATE_INTERNED_MORTAL\` and \`SSTATE_INTERNED_IMMORTAL\`; 3.12 adds \`SSTATE_INTERNED_IMMORTAL_STATIC\` for strings built into the interpreter ([PEP 683 immortal objects](https://peps.python.org/pep-0683/)).
- **3.13 lets you peek**: \`sys._is_interned(s)\` exists on our 3.13 run (\`True\` for \`"abc"\`, \`False\` for \`"".join(["a", "bc"])\`). It is a private, underscore-prefixed helper, not something to use in real code.

## 6. Verified: Running the Code

Example 1 (which literals are interned, \`sys.intern\`, attribute names and dict keys):

~~~text
"user_id"       interned: True
"hello"         interned: True
"x1"            interned: True
"hello world"   interned: False
"hello!"        interned: False
"café"          interned: False
""              interned: True
"ab" + "cd"     interned: True
built at run time: True False
after sys.intern:  True True
True
True
False
TypeError: intern() argument must be str, not bytes
~~~

Example 2 (identity-first lookups and deduplication):

~~~text
same object, __eq__ calls: 0
equal copy,  __eq__ calls: 1
distinct objects, plain:    30000
distinct objects, interned: 3
True
True False
True
~~~

What the output proves:

- Identifier-like literals become one shared object across separate compilations; literals with spaces, punctuation or accents do not.
- Equal strings built at run time are separate objects until \`sys.intern\` maps them to one.
- A dict lookup with the very same key object made **zero** \`__eq__\` calls; an equal copy needed one. Interning makes the zero-call path the normal one.
- \`x == "ERROR"\` was \`True\` the whole time; only \`is\` changed after interning.

## 7. Comparison: Interning vs the Small Int Cache

| | String interning | [Small integer cache](/interview-question/why-does-python-cache-small-integers) |
| :--- | :--- | :--- |
| What is shared | Identifier-like constants, names, and anything passed to \`sys.intern\` | Every int from -5 to 256 |
| When it happens | At compile time for constants and names, on \`setattr\`, or when you call \`sys.intern\` | Every time such an int is produced, however it is made |
| Can you opt in? | Yes, \`sys.intern(s)\` | No |
| Main purpose | Fast name lookups (identity check in dicts), memory for repeated text | Avoid allocating the most common numbers |
| Safe to rely on with \`is\`? | No — use \`==\` | No — use \`==\` |

## 8. Common Pitfalls

- **Comparing strings with \`is\`.** \`name is "admin"\` may pass in a test (identifier-like literal) and fail on input read from a request. CPython even warns: \`SyntaxWarning: "is" with a literal\`.
- **Assuming all literals are interned.** Literals with spaces, punctuation or non-ASCII characters are not, so \`"hello world"\` from two modules is two objects.
- **Expecting \`sys.intern\` to speed up everything.** It helps only when the same values repeat a lot or are looked up constantly; on unique strings it is wasted hashing.
- **Interning \`bytes\` or keys built from user input without bounds.** \`sys.intern\` rejects \`bytes\`, and interning millions of unique strings grows a global table — on 3.12, where our run showed interned strings becoming immortal, they are never freed.
- **Thinking interning changes equality.** \`==\` behaves identically before and after; interning only changes identity and memory use.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Interning keeps <strong style="color:#ffca28;">one canonical object per distinct string</strong> in an interpreter-wide table, so equal interned strings are the same object and can be compared by pointer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What CPython does on its own:</strong> <span style="color:#f0e2c8;">It interns identifiers, identifier-like string constants (ASCII letters, digits, underscore), the empty string and attribute names set with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setattr</code>; run-time strings, text with spaces or punctuation and file input are not interned.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it matters:</strong> <span style="color:#f0e2c8;">Dicts check identity before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> and strings cache their hash, so namespace, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__dict__</code> and keyword-argument lookups with interned names are a hash plus a pointer comparison.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. sys.intern:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.intern(s)</code> returns the canonical copy; use it for a few values repeated many times (log levels, column names, tokens) to save memory and speed up key lookups.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The rule:</strong> <span style="color:#f0e2c8;">It is a CPython implementation detail. Always compare strings with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> only works by accident and the compiler warns about <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is</code> with a literal.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">a is b</code> True for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"hello"</code> but False for <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"hello world"</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both literals in one compile share a constant, but across separate compilations only identifier-like literals are interned. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"hello world"</code> contains a space, so two modules or two REPL lines get two objects.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does interning make attribute access faster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.attr</code> is a dict lookup in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.__dict__</code> with key <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"attr"</code>. The name in the bytecode is interned and so is the stored key, so after the cached hash finds the slot, the identity check succeeds and no characters are compared.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sys.intern</code> in real code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When parsing large data with a small vocabulary: millions of rows with the same few column names, states or symbols. Interning collapses them to a handful of objects and makes dict lookups on them identity hits. For mostly unique strings it only adds hashing cost.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can interned strings be freed?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the version. On 3.11 and 3.13 a string you interned at run time showed a refcount of 2: the table reference is not counted, so it is freed when you drop it. On 3.12 the same string showed the immortal value 4294967295, so it lives until exit. Never intern unbounded input.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from the small int cache?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The int cache preallocates -5 to 256 and is always used for those values. Interning is selective for strings: it covers names and identifier-like constants automatically, and anything else only if you call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.intern</code>.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| String interning | One shared object per distinct string value |
| Intern table | CPython's interpreter-wide table of interned strings |
| Identity vs equality | \`is\` compares objects, \`==\` compares text |
| Identifier | A name in code; CPython interns all of them |
| \`sys.intern(s)\` | Returns the canonical interned copy of \`s\` |
| Deduplication | Replacing many equal objects with one shared object |

**Conclusion:** String interning is CPython keeping one object per distinct string in a shared table so that equal strings can be compared with a pointer check. The interpreter does it automatically where it pays off most — names, identifier-like constants and attribute keys — because every variable and attribute lookup is a dict lookup that checks identity before equality. Strings built at run time are not interned unless you call \`sys.intern\`, which is worth doing when a few values repeat a huge number of times. None of this changes what \`==\` returns, which is exactly why \`is\` must never be used to compare strings: interning is an optimisation, not a promise.`,
    examples: [
      {
        label: `Which strings get interned, and sys.intern`,
        code: `import sys

# Compile the same literal in two separate code objects (as the REPL
# or two different modules would) and ask: did we get ONE object?
def shared(literal):
    ns = {}
    exec("s1 = " + literal, ns)
    exec("s2 = " + literal, ns)
    return ns["s1"] is ns["s2"]

for literal in ['"user_id"', '"hello"', '"x1"', '"hello world"',
                '"hello!"', '"café"', '""', '"ab" + "cd"']:
    print(f"{literal:<15} interned: {shared(literal)}")

# Strings built while the program runs are NOT interned
a = "".join(["py", "thon"])
b = "".join(["py", "thon"])
print("built at run time:", a == b, a is b)

# sys.intern returns the one canonical copy from the intern table
a = sys.intern(a)
b = sys.intern(b)
print("after sys.intern: ", a == b, a is b)

# The first string interned wins: later calls return that object
first = sys.intern("".join(["ord", "er_42"]))
again = sys.intern("".join(["order", "_42"]))
print(again is first)  # True

# Python interns attribute names for you
class Config:
    pass

cfg = Config()
setattr(cfg, "".join(["time", "out"]), 30)
name_in_dict = next(iter(vars(cfg)))
print(name_in_dict is sys.intern("timeout"))  # True

# ...but not ordinary dict keys or text you read in
data = {"".join(["time", "out"]): 30}
print(next(iter(data)) is sys.intern("timeout"))  # False

# Only str can be interned
try:
    sys.intern(b"bytes")
except TypeError as e:
    print("TypeError:", e)`,
      },
      {
        label: `Why interning helps: identity-first lookups and deduplication`,
        code: `import sys

# Why interning speeds up lookups: dict and set compare by identity
# first, and only call __eq__ when the objects are different.
class Key:
    eq_calls = 0

    def __init__(self, text):
        self.text = text

    def __hash__(self):
        return hash(self.text)

    def __eq__(self, other):
        Key.eq_calls += 1
        return self.text == other.text

k = Key("status")
table = {k: "ok"}

Key.eq_calls = 0
table[k]
print("same object, __eq__ calls:", Key.eq_calls)

Key.eq_calls = 0
table[Key("status")]
print("equal copy,  __eq__ calls:", Key.eq_calls)

# Deduplicating repeated text: 30,000 log rows, only 3 distinct levels
levels = ["INFO", "WARN", "ERROR"]
rows = [levels[i % 3] for i in range(30_000)]
# Slicing and gluing makes a new string, like text read from a file
plain = [s[:2] + s[2:] for s in rows]
print("distinct objects, plain:   ", len({id(s) for s in plain}))

interned = [sys.intern(s[:2] + s[2:]) for s in rows]
print("distinct objects, interned:", len({id(s) for s in interned}))
print(plain == interned)  # True

# Equal text is equal either way; is is only safe after sys.intern
x = "".join(["ER", "ROR"])
print(x == "ERROR", x is sys.intern("ERROR"))
x = sys.intern(x)
print(x is sys.intern("ERROR"))  # True`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `How does Timsort make Python's sort fast and stable?`,
    difficulty: "medium",
    seoDescription: `How Python sorts: Timsort finds natural runs, extends them to minrun with insertion sort and merges them stably, in powersort order since 3.11.`,
    description: `**Question presented to candidate:**
"Python's \`sorted()\` and \`list.sort()\` use an algorithm called Timsort. How does it work, why is it so fast on real-world data, and why is it guaranteed to be stable? What is its complexity?"

**What a strong answer should cover:**
- Timsort is a hybrid, **adaptive**, **stable** merge sort designed by Tim Peters for CPython (2002): it exploits order that already exists in the data
- It scans for **natural runs** (non-descending, or strictly descending which it reverses in place), extends short runs to **minrun** (32-64 elements) with binary insertion sort, and **merges** neighbouring runs
- The merge order keeps runs balanced; since CPython 3.11 it follows the **powersort** rule (bpo-34561) instead of the original stack invariants; merges use **galloping** when one run keeps winning
- Complexity: O(n log n) worst case, **O(n)** best case (about n - 1 comparisons on sorted or reversed input), O(n) extra memory for merging
- Stability comes from never moving an element past an equal one: runs are only reversed when strictly descending, and merges take from the left run on ties; that enables multi-pass sorts by several keys
- Only \`<\` is ever used, and the key function is called exactly once per element

**Code / implementation expected:** Optional — counting comparisons on sorted vs shuffled data, or sketching run detection and merging.`,
    answer: `**Target Audience:** Developers who know what sorting is and have heard of merge sort and insertion sort. Everything else is explained.
**Difficulty:** Medium
**Python version:** Behaviour and comparison counts checked on CPython 3.11 and 3.12 (identical counts). Both examples also run in the page on Pyodide 0.25.1 (CPython 3.11.3).

> **How to read this doc:** Each idea is explained in plain words first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined on the spot. All of them are collected in the Quick Glossary at the end. Every output shown was produced by running the code.

## 1. Why This Even Matters — A Story First

A librarian gets a returned-books trolley to shelve in order. A textbook algorithm would treat the trolley as random chaos and do the full amount of work every time. But the librarian notices something: the books came back from three study rooms, and each room's pile is already mostly in order. So she does not start from scratch. She splits the trolley into the stretches that are already in order, tidies the tiny stretches by hand, and then merges the stretches together two at a time — always merging piles of similar size, so she never ends up carrying one book across a mountain of others over and over. On a trolley that is already sorted she just walks along it once and is done.

**That is Timsort.** Real data is rarely random: logs arrive in time order, a list gets a few new items appended, a table is "sorted except for yesterday's rows". Timsort finds the order that is already there and does less work the more of it there is, while still never being worse than a good merge sort on truly random data. Interviewers ask about it because it is the sort behind every \`sorted()\` call, and because its two promises — fast on nearly-sorted data, and stable — have practical consequences you are expected to use.

📌 **Interview term: Timsort** — the hybrid of merge sort and insertion sort that Tim Peters wrote for CPython in 2002; he described it on python-dev as a "stable natural mergesort" ([his July 2002 post](https://www.python.org/pipermail/python-dev/2002-July/026897.html)). It has been CPython's \`list.sort\` since Python 2.3 and was later adopted elsewhere, for example Java's \`TimSort\` for object arrays ([JDK 11 source](https://gee.cs.oswego.edu/dl/jsr166/src/jdk11/java/util/TimSort.java)).

## 2. The Three Building Blocks

📌 **Interview term: Adaptive sort** — a sort whose running time depends on how ordered the input already is. Timsort uses about n - 1 comparisons on an already sorted list and O(n log n) on a random one.

📌 **Interview term: Stable sort** — a sort that keeps items with equal keys in their original relative order. Python's documentation guarantees it for both \`sorted()\` and \`list.sort()\` ([Sorting HOW TO](https://docs.python.org/3/howto/sorting.html)).

📌 **Interview term: Natural run** — a stretch of the list that is already in order: either **non-descending** (\`a[i] <= a[i+1]\`) or **strictly descending** (\`a[i] > a[i+1]\`). Strictly descending runs are reversed in place. They must be *strictly* descending so that reversing never swaps two equal items — that would break stability.

### Step 1 — find runs, and make short runs at least minrun long

Timsort walks the list from left to right. At each position it measures the natural run starting there. If the run is shorter than **minrun**, it extends it to minrun elements using **binary insertion sort**: take the next element, binary-search where it belongs inside the run, shift the rest up, insert.

📌 **Interview term: Binary insertion sort** — insertion sort that finds each element's position with binary search (few comparisons) and then shifts elements to make room (a fast memory move). It is the best choice for tiny lists, and Timsort uses it to build runs of a useful size.

📌 **Interview term: minrun** — the minimum run length, chosen between 32 and 64 from the list length so that n / minrun is a power of two or just under one. That keeps the later merges balanced. For lists shorter than 64 it is n itself: the whole list is just binary-insertion sorted.

Example 2 ports the rule ("take the top 6 bits of n, add 1 if any of the remaining bits are set") and prints it for a few sizes:

~~~text
[63, 32, 33, 63, 32, 62]
~~~

That is \`n = 63, 64, 65, 1000, 2048, 1000000\`. For 2048 the answer is exactly 32, giving 64 runs, a power of two. For 1000 it is 63, giving 16 runs (the last one a bit short).

### Step 2 — push each run on a stack and merge neighbours

Each finished run is pushed onto a stack of pending runs. Before pushing, Timsort decides whether some runs already on the stack should be merged now. The goal is that merges combine runs of **similar length**: merging a run of 10 into a run of 10,000 over and over would waste time moving the big run.

📌 **Interview term: Powersort merge policy** — the rule CPython uses since **3.11** to decide the merge order. Each boundary between two neighbouring runs gets a "power": how deep in an imaginary perfectly balanced binary tree the midpoints of the two runs separate. A run boundary with a higher power is merged first. It replaced Tim Peters's original stack invariants after [bpo-34561](https://android.googlesource.com/platform/external/python/cpython3/+/5cb4c672d8), with Ian Munro and Sebastian Wild's powersort, which the commit describes as "provably near-optimal in the entropy of the distribution of run lengths". The commit also says most uses "probably won't see a significant time difference" — the point was to remove bad cases.

<svg class="iq-diagram" width="100%" viewBox="0 0 920 300" role="img" aria-label="Timsort splits a list into runs, then merges neighbouring runs pairwise into one sorted list">
  <defs>
    <marker id="py22q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="180" height="50" rx="8"/>
  <text class="d-text" x="110" y="60" text-anchor="middle">run A ascending</text>
  <rect class="d-box" x="250" y="30" width="180" height="50" rx="8"/>
  <text class="d-text" x="340" y="60" text-anchor="middle">run B reversed</text>
  <rect class="d-box-muted" x="480" y="30" width="180" height="50" rx="8"/>
  <text class="d-text" x="570" y="60" text-anchor="middle">run C padded</text>
  <rect class="d-box-muted" x="710" y="30" width="180" height="50" rx="8"/>
  <text class="d-text" x="800" y="60" text-anchor="middle">run D padded</text>
  <rect class="d-box-accent" x="130" y="140" width="190" height="50" rx="8"/>
  <text class="d-text" x="225" y="170" text-anchor="middle">merge A B</text>
  <rect class="d-box-accent" x="590" y="140" width="190" height="50" rx="8"/>
  <text class="d-text" x="685" y="170" text-anchor="middle">merge C D</text>
  <rect class="d-box-accent" x="335" y="240" width="240" height="50" rx="8"/>
  <text class="d-text" x="455" y="270" text-anchor="middle">one sorted list</text>
  <path class="d-edge" d="M 110 82 L 195 136" marker-end="url(#py22q4-arrow)"/>
  <path class="d-edge" d="M 340 82 L 255 136" marker-end="url(#py22q4-arrow)"/>
  <path class="d-edge" d="M 570 82 L 655 136" marker-end="url(#py22q4-arrow)"/>
  <path class="d-edge" d="M 800 82 L 715 136" marker-end="url(#py22q4-arrow)"/>
  <path class="d-edge-accent" d="M 225 192 L 415 236" marker-end="url(#py22q4-arrow)"/>
  <path class="d-edge-accent" d="M 685 192 L 495 236" marker-end="url(#py22q4-arrow)"/>
</svg>

Long natural runs are used as they are, a strictly descending run is reversed, and short ones are padded to minrun with insertion sort; then neighbours of similar size are merged until one run is left. The real merge order depends on run lengths, as Example 2's log shows.

### Step 3 — merge, galloping when one side keeps winning

A normal merge compares the front items of the two runs and takes the smaller. **Ties go to the left run**, which is the second half of the stability guarantee (the first half is "only reverse strictly descending runs").

📌 **Interview term: Galloping** — the merge's shortcut when one run keeps winning. Instead of comparing item by item, it searches ahead with exponentially growing steps and then binary-searches the bracket it found, so it can copy a whole block from one run in a few comparisons. The technique comes from earlier work by Carlsson, Levcopoulos and Petersson (1990) and McIlroy (1993), and it is not free: on data where the runs interleave finely it would cost more comparisons than a plain merge, so Timsort only switches to it after a streak of wins and adjusts how readily it does so as the sort goes ([overview of the algorithm](https://en.wikipedia.org/wiki/Timsort)).

You can see galloping in comparison counts. Example 1 sorts three lists made of two runs of 500. Finding the two runs costs roughly 998 comparisons in each case; the rest is the merge:

~~~text
halves swapped   1025
odd then even    1998
blocks of 50     1233
~~~

- **Halves swapped** (\`500..999\` then \`0..499\`): the runs do not overlap at all, and the merge costs only about 27 comparisons — the whole block is moved after a few searches.
- **Odd then even**: the runs interleave perfectly, every merge step flips sides, galloping never pays, and the merge costs about 1,000 comparisons, one per element.
- **Blocks of 50**: the runs alternate in blocks of 50, so the merge copies whole blocks and costs about 235.

## 3. Watching It Work: a Toy Timsort

Example 2 is a small, readable model in Python: run detection, minrun padding with \`bisect.insort_right\`, a powersort stack and a plain stable merge without galloping. On a list made of an ascending run of 100, a descending run of 100, sixty repeating \`7, 3, 9\` values and a final ascending stretch, it logs:

~~~text
run [0:100] natural length 100
run [100:200] natural length 100
run [200:238] natural length 2
run [238:276] natural length 3
merge [100:200] + [200:238]
run [276:300] natural length 24
merge [238:276] + [276:300]
merge [100:238] + [238:300]
merge [0:100] + [100:300]
matches sorted(): True
stable like sorted(): True
~~~

Reading the log:

- The first two runs are found whole (the descending one is reversed). The next two had natural lengths of only 2 and 3 and were padded to 38 elements by insertion sort (minrun for n = 300 is 38).
- The powersort rule merged the *second* run with the third before touching the first, then merged the last two small runs together, and the big first run last: merges stay between similar sizes.
- The result equals \`sorted(data)\`, and a 500-record stability test matches \`sorted()\` exactly.

It is a model for understanding, not CPython's code: the real sort in \`Objects/listobject.c\` is C, gallops, merges through a temporary buffer, and handles many more special cases. Its merge *order* follows the powersort rule, but it was not instrumented against CPython itself.

## 4. Complexity and Cost

| Case | Comparisons | Why |
| :--- | :--- | :--- |
| Already sorted | n - 1 | One run covers the whole list; nothing to merge |
| Strictly reversed | n - 1 | One descending run, reversed in place |
| k sorted runs glued together | about n log k | Only the runs need merging |
| Random | O(n log n) | Many short runs padded to minrun, then balanced merges |
| Worst case | O(n log n) | Merges are balanced, so there is no quadratic case |
| Extra memory | O(n) | Merging needs a temporary buffer; Tim Peters named this space cost as the main downside in the 2002 patch discussion |

Example 1 counts comparisons for n = 1000 with a value class that counts its \`__lt__\` calls:

~~~text
n = 1000, n*log2(n) is about 9966
already sorted   999
reversed         999
four runs        2998
one swap         1039
shuffled         8632
~~~

- Sorted and reversed input cost exactly n - 1 = 999 comparisons: an O(n) best case.
- "Four runs" interleaves four ascending sequences; it costs 2998, far below n log2 n.
- Swapping just two elements of a sorted list costs 1039: almost free, because nearly all of the list is found as runs.
- A shuffled list costs 8632 comparisons, a bit under n log2 n = 9966. The same numbers, including the three two-run cases from section 2, printed on 3.12.

Comparisons matter more in Python than in C: each one is a Python-level \`__lt__\` call for objects, or at least a type dispatch for built-ins, so a sort that does 999 instead of ~9000 comparisons is genuinely ~9x less work.

## 5. Stability in Practice

Because the sort is stable, you can sort by several fields in several passes, **least important field first**:

~~~text
[('bob', 1), ('eve', 1), ('dee', 2), ('ann', 3), ('cy', 3)]
[('dev', 'kim'), ('dev', 'max'), ('ops', 'amy'), ('ops', 'zoe')]
[('ann', 3), ('cy', 3), ('dee', 2), ('bob', 1), ('eve', 1)]
['fig', 'kiwi', 'apple', 'banana'] 4
~~~

- Orders with the same priority keep their original order: \`bob\` before \`eve\`, \`ann\` before \`cy\`.
- Sorting staff by name, then by team, gives "by team, then by name within the team".
- \`reverse=True\` is also stable: \`ann\` still comes before \`cy\`. It is not "sort, then reverse the list", which would flip equal items.
- The key function ran 4 times for 4 words: keys are computed **once** per element and cached, not on every comparison. Details on keys are in [sorting with a custom key](/interview-question/how-do-you-sort-with-a-custom-key-and-how-does-sorted-differ-from-sort).

📌 **Interview term: Rich comparison \`__lt__\`** — the method behind \`<\`. \`list.sort\` only ever uses \`<\`, so a class needs nothing but \`__lt__\` to be sortable; Example 1's \`Counted\` class defines no other comparison method. (\`functools.total_ordering\` is only needed if *your* code uses \`>\`, \`<=\` or \`>=\`.)

## 6. Verified: Running the Code

Example 1 (comparison counts, stability, \`reverse=True\` and key calls), in the page and on python3.11:

~~~text
n = 1000, n*log2(n) is about 9966
already sorted   999
reversed         999
four runs        2998
one swap         1039
shuffled         8632
halves swapped   1025
odd then even    1998
blocks of 50     1233
[('bob', 1), ('eve', 1), ('dee', 2), ('ann', 3), ('cy', 3)]
[('dev', 'kim'), ('dev', 'max'), ('ops', 'amy'), ('ops', 'zoe')]
[('ann', 3), ('cy', 3), ('dee', 2), ('bob', 1), ('eve', 1)]
['fig', 'kiwi', 'apple', 'banana'] 4
~~~

Example 2 (minrun values and the toy Timsort's run and merge log):

~~~text
[63, 32, 33, 63, 32, 62]
run [0:100] natural length 100
run [100:200] natural length 100
run [200:238] natural length 2
run [238:276] natural length 3
merge [100:200] + [200:238]
run [276:300] natural length 24
merge [238:276] + [276:300]
merge [100:238] + [238:300]
merge [0:100] + [100:300]
matches sorted(): True
stable like sorted(): True
~~~

What the output proves:

- Already-ordered input costs exactly n - 1 comparisons, so Timsort really is adaptive.
- Equal keys keep their input order through \`sorted\`, \`list.sort\` and \`reverse=True\`.
- The key function is called once per element.
- A short program that only finds runs, pads them with insertion sort and merges by the powersort rule reproduces \`sorted()\` exactly, including stability.

## 7. Edge Cases

- **Mixed types fail partway.** \`[3, 1, "x", 2].sort()\` raises \`TypeError: '<' not supported between instances of 'str' and 'int'\`. The documentation does not promise what state the list is left in, so do not rely on it.
- **Mutating the list during the sort is detected.** A key function that appends to the list being sorted makes the sort raise \`ValueError: list modified during sort\` (our 3.11 run).
- **Inconsistent \`__lt__\`** (for example with \`float("nan")\`, where every comparison is \`False\`) does not crash, but the result is not meaningfully sorted.
- **Lists under 64 elements** skip merging entirely: they are one binary insertion sort.
- **Sorting is the right tool for the full order**; for "top k of n" use \`heapq.nsmallest\`, covered in [how heapq works](/interview-question/how-does-heapq-work-in-python), and for keeping a list sorted as you insert use [bisect](/interview-question/how-does-the-bisect-module-work).

## 8. Common Pitfalls

- **Calling Timsort "just merge sort".** The point is that it is *adaptive*: natural runs, binary insertion for short runs, balanced merges and galloping. Plain merge sort does n log n work even on sorted data.
- **Reversing after sorting to get descending order with ties preserved.** \`sorted(x, reverse=True)\` keeps equal items in input order; \`sorted(x)[::-1]\` reverses them.
- **Sorting by several keys with several passes in the wrong order.** Sort by the least important key first, the most important last — or use one tuple key.
- **Defining \`__eq__\` or \`__gt__\` and expecting sort to use them.** Sort uses only \`<\`; a missing or inconsistent \`__lt__\` is what breaks it.
- **Assuming the merge policy is the same in every version.** CPython 3.11 switched to powersort; descriptions of the original "stack invariants" describe 3.10 and earlier. The output is identical either way; only the internal merge order differs.

## 9. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">Timsort is CPython's <strong style="color:#ffca28;">adaptive, stable</strong> hybrid of merge sort and insertion sort: it finds runs that are already ordered and merges them, so it does less work the more ordered the data is.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">Scan for natural runs (reverse strictly descending ones), extend short runs to <strong style="color:#ffca28;">minrun</strong> (32-64) with binary insertion sort, push runs on a stack, and merge neighbours of similar size, galloping when one side keeps winning.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The merge order:</strong> <span style="color:#f0e2c8;">Since 3.11 CPython picks merges with the <strong style="color:#ffca28;">powersort</strong> rule (bpo-34561), which is near-optimal for the run lengths; before that it used Tim Peters stack invariants.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Complexity:</strong> <span style="color:#f0e2c8;">O(n log n) worst case, <strong style="color:#ffca28;">O(n)</strong> best case (n - 1 comparisons on sorted or reversed input), O(n) extra memory; only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;</code> is used and keys are computed once per element.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Stability:</strong> <span style="color:#f0e2c8;">Only strictly descending runs are reversed and merges take ties from the left, so equal keys keep their order; that is what makes multi-pass sorts and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse=True</code> safe.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is Timsort fast on real data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Real data is often partly ordered: appended logs, nearly sorted tables, concatenated sorted lists. Timsort detects those runs for free while scanning and only merges them, so a sorted list costs n - 1 comparisons and a list with one swap costs barely more.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not quicksort?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Quicksort is not stable, has a quadratic worst case unless carefully guarded, and does not exploit existing order. In Python, where each comparison is expensive, doing fewer comparisons matters more than cache-friendly partitioning.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is galloping?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When one run wins many merge steps in a row, Timsort switches to an exponential search followed by binary search to find how many items to copy at once. It turns long one-sided stretches into a few comparisons, and is avoided on random data where it would cost extra.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is minrun and why that range?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The minimum run length, 32 to 64, chosen so n divided by minrun is close to a power of two. Runs that size are cheap to build with binary insertion sort, and a power-of-two count keeps the final merges balanced.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you sort by two fields, one ascending and one descending?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rely on stability: sort by the secondary field first, then by the primary field with its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reverse</code> flag. Or use a single tuple key and negate numeric fields.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Timsort | CPython's adaptive, stable merge sort and insertion sort hybrid |
| Adaptive sort | Runs faster the more ordered the input already is |
| Stable sort | Equal keys keep their original order |
| Natural run | An already ordered stretch: non-descending, or strictly descending and reversed |
| Binary insertion sort | Insertion sort that finds positions by binary search; used for short runs |
| minrun | Minimum run length, 32-64, chosen from n to balance merges |
| Powersort merge policy | The 3.11+ rule for which neighbouring runs to merge next |
| Galloping | Exponential plus binary search inside a merge when one run keeps winning |
| Rich comparison \`__lt__\` | The only comparison method \`list.sort\` calls |

**Conclusion:** Timsort is fast because it refuses to pretend data is random: it reads the runs that already exist, pads short ones with binary insertion sort, and merges runs of similar size — by the powersort rule since 3.11 — galloping through long one-sided stretches. That gives n - 1 comparisons on ordered input and O(n log n) in the worst case. It is stable by construction, because it reverses only strictly descending runs and breaks merge ties toward the left, and that guarantee is what lets you sort by several keys in several passes or use \`reverse=True\` without scrambling equal items. Mention that only \`<\` is used and keys are computed once, and the answer is complete.`,
    examples: [
      {
        label: `Counting comparisons, and what stability buys you`,
        code: `import math
import random

# A value that counts how often sort compares it. Only __lt__ is
# defined: list.sort never needs ==, >, <= or >=.
class Counted:
    compares = 0

    def __init__(self, value):
        self.value = value

    def __lt__(self, other):
        Counted.compares += 1
        return self.value < other.value

def comparisons(values):
    items = [Counted(v) for v in values]
    Counted.compares = 0
    items.sort()
    assert [c.value for c in items] == sorted(values)
    return Counted.compares

n = 1000
shuffled = list(range(n))
random.Random(42).shuffle(shuffled)
four_runs = [v for start in range(4) for v in range(start, n, 4)]
nearly = list(range(n))
nearly[100], nearly[900] = nearly[900], nearly[100]

print(f"n = {n}, n*log2(n) is about {round(n * math.log2(n))}")
print(f"{'already sorted':<16}", comparisons(range(n)))
print(f"{'reversed':<16}", comparisons(range(n, 0, -1)))
print(f"{'four runs':<16}", comparisons(four_runs))
print(f"{'one swap':<16}", comparisons(nearly))
print(f"{'shuffled':<16}", comparisons(shuffled))

# Two runs of 500: how much does the MERGE cost on top of the
# roughly 998 comparisons it takes to find the two runs?
halves_swapped = list(range(500, 1000)) + list(range(500))
odd_even = list(range(0, 1000, 2)) + list(range(1, 1000, 2))
left = [v for s in range(0, 1000, 100) for v in range(s, s + 50)]
right = [v for s in range(50, 1000, 100) for v in range(s, s + 50)]
print(f"{'halves swapped':<16}", comparisons(halves_swapped))
print(f"{'odd then even':<16}", comparisons(odd_even))
print(f"{'blocks of 50':<16}", comparisons(left + right))

# Stability: equal keys keep their original order
orders = [("ann", 3), ("bob", 1), ("cy", 3), ("dee", 2), ("eve", 1)]
by_priority = sorted(orders, key=lambda o: o[1])
print(by_priority)  # [('bob', 1), ('eve', 1), ('dee', 2), ('ann', 3), ('cy', 3)]

# So you can sort by several fields with several passes,
# least important field first
staff = [("ops", "zoe"), ("dev", "max"), ("ops", "amy"), ("dev", "kim")]
staff.sort(key=lambda s: s[1])
staff.sort(key=lambda s: s[0])
print(staff)  # [('dev', 'kim'), ('dev', 'max'), ('ops', 'amy'), ('ops', 'zoe')]

# reverse=True keeps stability too (it is not sort then reverse)
print(sorted(orders, key=lambda o: o[1], reverse=True))

# The key function runs exactly once per element
calls = []
def noisy_key(word):
    calls.append(word)
    return len(word)

words = ["kiwi", "fig", "banana", "apple"]
print(sorted(words, key=noisy_key), len(calls))`,
      },
      {
        label: `A toy Timsort: runs, minrun, insertion sort and powersort merging`,
        code: `from bisect import insort_right
import random

# A small teaching model of CPython list.sort (3.11+): find natural
# runs, stretch short runs to minrun with binary insertion sort, then
# merge neighbouring runs in the order the powersort rule picks.

def compute_minrun(n):
    extra = 0                      # keep the top 6 bits of n,
    while n >= 64:                 # add 1 if any lower bit was set
        extra |= n & 1
        n >>= 1
    return n + extra

def find_run(a, lo):
    hi = lo + 1
    if hi == len(a):
        return hi
    if a[hi] < a[lo]:              # strictly descending: reverse it
        while hi + 1 < len(a) and a[hi + 1] < a[hi]:
            hi += 1
        a[lo:hi + 1] = reversed(a[lo:hi + 1])
    else:                          # non-descending
        while hi + 1 < len(a) and not a[hi + 1] < a[hi]:
            hi += 1
    return hi + 1

def merge(a, lo, mid, hi, log):
    log.append(f"merge [{lo}:{mid}] + [{mid}:{hi}]")
    left, right = a[lo:mid], a[mid:hi]
    i = j = 0
    for k in range(lo, hi):        # right wins only if strictly smaller
        if j < len(right) and (i == len(left) or right[j] < left[i]):
            a[k] = right[j]; j += 1
        else:
            a[k] = left[i]; i += 1

def node_power(n, s1, n1, n2):     # depth where the two run midpoints split
    a, b, p = 2 * s1 + n1, 2 * s1 + 2 * n1 + n2, 0
    while (a << p) // (2 * n) == (b << p) // (2 * n):
        p += 1
    return p

def merge_top(a, stack, log):
    start, length, _ = stack.pop()
    merge(a, stack[-1][0], start, start + length, log)
    stack[-1][1] += length

def toy_timsort(a, log):
    n, minrun, stack, lo = len(a), compute_minrun(len(a)), [], 0
    while lo < n:
        hi = find_run(a, lo)
        natural = hi - lo
        while hi < min(lo + minrun, n):          # binary insertion sort
            insort_right(a, a.pop(hi), lo, hi)
            hi += 1
        log.append(f"run [{lo}:{hi}] natural length {natural}")
        if stack:                                # powersort merge rule
            p = node_power(n, stack[-1][0], stack[-1][1], hi - lo)
            while len(stack) > 1 and stack[-2][2] > p:
                merge_top(a, stack, log)
            stack[-1][2] = p
        stack.append([lo, hi - lo, 0])           # [start, length, power]
        lo = hi
    while len(stack) > 1:
        merge_top(a, stack, log)
    return a

print([compute_minrun(n) for n in (63, 64, 65, 1000, 2048, 10**6)])

up, down = list(range(0, 300, 3)), list(range(200, 0, -2))
data = up + down + [7, 3, 9] * 20 + up[:40]
log = []
result = toy_timsort(data[:], log)
print("\\n".join(log))
print("matches sorted():", result == sorted(data))

class Rec:                                       # compared by key only
    def __init__(self, key, pos): self.key, self.pos = key, pos
    def __lt__(self, other): return self.key < other.key

rng = random.Random(7)
recs = [Rec(rng.randint(0, 9), i) for i in range(500)]
pairs = [(r.key, r.pos) for r in toy_timsort(recs[:], [])]
print("stable like sorted():", pairs == sorted((r.key, r.pos) for r in recs))`,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  {
    title: `What is the Global Interpreter Lock (GIL)?`,
    difficulty: "medium",
    seoDescription: `The GIL explained: why CPython has it, when it is released, why CPU-bound threads do not speed up, why you still need locks, and what comes next.`,
    description: `**Question presented to candidate:**
"What is the GIL in Python? Why does CPython have one, what does it mean for multithreaded programs, and if it only lets one thread run at a time, why do we still need locks?"

**What a strong answer should cover:**
- The GIL is a mutex inside CPython: only the thread holding it may execute Python bytecode, so one interpreter runs at most one thread of Python code at a time, even on many cores
- Why it exists: CPython's memory management (reference counts on every object) and much of its internals and C-extension ecosystem are not thread-safe; one global lock made them safe simply and keeps single-threaded code fast
- When it is released: on blocking I/O and \`time.sleep\`, inside C code that opts out (\`Py_BEGIN_ALLOW_THREADS\`, used by many I/O and number-crunching libraries), and every **switch interval** (5 ms by default, \`sys.getswitchinterval()\`) so other threads get a turn
- Consequence: threads speed up **I/O-bound** work but not **CPU-bound** pure-Python work; use \`multiprocessing\`/\`ProcessPoolExecutor\` or C extensions for CPU parallelism
- The GIL does **not** make your code thread-safe: \`counter += 1\` is several bytecodes and a switch can land between them, so shared state still needs \`threading.Lock\`
- Where it is going: per-interpreter GILs in 3.12 (PEP 684), an optional free-threaded build in 3.13 (PEP 703, experimental) that became officially supported in 3.14 (PEP 779)

**Clarifying questions expected:**
- Is the workload CPU-bound or I/O-bound?
- Which Python version and build (standard or free-threaded) will it run on?

**Code / implementation expected:** Optional — showing that \`counter += 1\` is several bytecodes, or contrasting CPU-bound and I/O-bound threads.`,
    answer: `**Target Audience:** Python developers who have used or heard of threads and want to understand what CPython actually allows. No operating-systems background is assumed.
**Difficulty:** Medium
**Python version:** Behaviour checked on standard (GIL) builds of CPython 3.11, 3.12 and 3.13. Example 1 also runs in the page on Pyodide 0.25.1 (CPython 3.11.3); Example 2 uses real threads, which the browser build cannot start, so it is verified on 3.12.

> **How to read this doc:** Each idea is explained in plain words first. When a word appears that an interviewer expects you to know, it is tagged with \`📌 Interview term:\` and defined on the spot. All of them are collected in the Quick Glossary at the end. Every output shown was produced by running the code.

## 1. Why This Even Matters — A Story First

A shared kitchen has four cooks but only one chef's knife, and the house rule is simple: you may only cook while holding the knife. Any cook can be *waiting* for the oven, the delivery van or the kettle without the knife, and that waiting happens in parallel. But actual chopping happens one cook at a time. Every few moments the cook holding the knife has to put it down so someone else can have a turn.

Why such a rule? Because the kitchen's inventory system — who is using which bowl, when a bowl can be washed — was built assuming only one person touches it at a time. One knife is the simplest way to make that true.

**The knife is the Global Interpreter Lock.** The cooks are threads. Waiting for the oven is I/O. Chopping is running Python bytecode. With four cooks you get dinner faster if most of the work is waiting (I/O-bound), but not if most of it is chopping (CPU-bound). And the rule does not stop two cooks from both reading the same recipe card, going off to chop, and each writing "done" over the other's notes — which is why you still need locks for your own shared data. Interviewers ask this because it decides how you parallelise Python, and because "the GIL makes my code thread-safe" is one of the most common wrong answers in backend interviews.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is the work CPU-bound or I/O-bound? | Threads help I/O-bound work under the GIL; CPU-bound pure Python needs processes or native code |
| Which Python version and which build? | 3.13+ offers a free-threaded build without a GIL; 3.12 has per-interpreter GILs |
| Is the heavy part in pure Python or in a C library? | Many C libraries release the GIL while they compute, so threads can scale there |
| Is there shared mutable state between the threads? | It needs explicit locks whatever the GIL does |

## 3. What the GIL Is

📌 **Interview term: Thread** — an independent sequence of execution inside one process. Threads share the same memory (the same objects), which makes sharing data easy and makes it dangerous.

📌 **Interview term: Mutex (lock)** — an object that only one thread can hold at a time; others that try to acquire it wait until it is released.

📌 **Interview term: Global Interpreter Lock (GIL)** — a mutex inside CPython that a thread must hold to execute Python bytecode or touch Python objects. Per interpreter there is one, so at any instant at most one thread is running Python code, no matter how many CPU cores the machine has.

<svg class="iq-diagram" width="100%" viewBox="0 0 880 250" role="img" aria-label="Timeline of three threads where only one runs Python code at a time while the others wait for the GIL or wait on I/O">
  <text class="d-sub" x="70" y="62" text-anchor="middle">thread 1</text>
  <text class="d-sub" x="70" y="132" text-anchor="middle">thread 2</text>
  <text class="d-sub" x="70" y="202" text-anchor="middle">thread 3</text>
  <rect class="d-box-accent" x="140" y="40" width="140" height="40" rx="6"/>
  <text class="d-text" x="210" y="66" text-anchor="middle">runs</text>
  <rect class="d-box-muted" x="320" y="40" width="280" height="40" rx="6"/>
  <text class="d-sub" x="460" y="66" text-anchor="middle">waits for the GIL</text>
  <rect class="d-box-accent" x="640" y="40" width="140" height="40" rx="6"/>
  <text class="d-text" x="710" y="66" text-anchor="middle">runs</text>
  <rect class="d-box-muted" x="140" y="110" width="140" height="40" rx="6"/>
  <text class="d-sub" x="210" y="136" text-anchor="middle">waits</text>
  <rect class="d-box-accent" x="320" y="110" width="140" height="40" rx="6"/>
  <text class="d-text" x="390" y="136" text-anchor="middle">runs</text>
  <rect class="d-box" x="500" y="110" width="300" height="40" rx="6"/>
  <text class="d-sub" x="650" y="136" text-anchor="middle">blocked on a socket, GIL released</text>
  <rect class="d-box" x="140" y="180" width="300" height="40" rx="6"/>
  <text class="d-sub" x="290" y="206" text-anchor="middle">reading a file, GIL released</text>
  <rect class="d-box-accent" x="480" y="180" width="140" height="40" rx="6"/>
  <text class="d-text" x="550" y="206" text-anchor="middle">runs</text>
</svg>

At every moment only one row is highlighted as running Python code, but waiting on I/O happens in all rows at once. That is the whole performance story of the GIL in one picture.

It is a property of **CPython**, the standard implementation; other implementations make their own choices. And it is per *interpreter*, not per machine: separate processes each have their own interpreter and their own GIL.

## 4. Why CPython Has a GIL

The key reason is **reference counting**.

📌 **Interview term: Reference count** — the counter inside every CPython object of how many references point to it; when it reaches zero the object is freed immediately. See [memory management and garbage collection](/interview-question/how-does-python-manage-memory-and-garbage-collection).

Reference counts change all the time — every assignment, function call, list append and loop iteration. Example 1 shows a single assignment moving it:

~~~text
refcount went up by 1
after del, back to the start: True
~~~

If two threads changed the same count at the same moment without coordination, one update could be lost: an object might be freed while still in use (a crash) or never freed (a leak). Protecting every count with its own lock would make every operation slower, even in single-threaded programs, and invite deadlocks. One big lock around the whole interpreter is simple, makes single-threaded code fast, and makes writing C extensions easy, because extension authors can assume nobody else touches Python objects while their code runs. That trade-off made sense when it was chosen in the single-core era, and the huge ecosystem of C extensions built on that assumption is why it was hard to remove.

## 5. When the GIL Is Released

A thread does not keep the GIL forever. It gives it up in three situations:

1. **Blocking I/O and sleeping.** Reading a socket, waiting for a file, \`time.sleep\`, waiting on a lock — CPython releases the GIL around the blocking call, so other threads run Python code meanwhile.
2. **C code that opts out.** C extensions can release the GIL while they work on their own data, using the \`Py_BEGIN_ALLOW_THREADS\` / \`Py_END_ALLOW_THREADS\` macros (declared in CPython's \`ceval.h\`). Many I/O, compression and numeric libraries do this; NumPy, for example, documents that many of its operations release the GIL ([NumPy thread safety](https://numpy.org/doc/2.4/reference/thread_safety.html)), so threads calling them can run on several cores.
3. **The switch interval.** A thread that keeps running bytecode is asked to drop the GIL after a time slice so waiting threads get a turn.

📌 **Interview term: Switch interval** — how long a thread may hold the GIL before CPython asks it to hand over: \`sys.getswitchinterval()\`, 0.005 seconds (5 ms) by default (Example 1 prints it; 3.12 and 3.13 gave the same value), adjustable with \`sys.setswitchinterval()\`. This time-based scheme came with the reworked "new GIL" by Antoine Pitrou in Python 3.2 ([David Beazley, Inside the New GIL](https://speakerdeck.com/dabeaz/inside-the-new-gil)); the older instruction-count API \`sys.setcheckinterval\` no longer exists on 3.11 (\`AttributeError\` on our run).

<svg class="iq-diagram" width="100%" viewBox="0 0 860 220" role="img" aria-label="A running thread releases the GIL at blocking I/O, inside C code that opts out, and when the 5 ms switch interval expires">
  <defs>
    <marker id="py22q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="330" y="20" width="200" height="56" rx="8"/>
  <text class="d-text" x="430" y="54" text-anchor="middle">holds the GIL</text>
  <rect class="d-box" x="20" y="140" width="230" height="60" rx="8"/>
  <text class="d-text" x="135" y="166" text-anchor="middle">blocking I/O</text>
  <text class="d-sub" x="135" y="188" text-anchor="middle">socket, file, sleep</text>
  <rect class="d-box" x="315" y="140" width="230" height="60" rx="8"/>
  <text class="d-text" x="430" y="166" text-anchor="middle">C code opts out</text>
  <text class="d-sub" x="430" y="188" text-anchor="middle">ALLOW_THREADS macros</text>
  <rect class="d-box" x="610" y="140" width="230" height="60" rx="8"/>
  <text class="d-text" x="725" y="166" text-anchor="middle">switch interval</text>
  <text class="d-sub" x="725" y="188" text-anchor="middle">5 ms by default</text>
  <path class="d-edge" d="M 380 78 L 160 136" marker-end="url(#py22q5-arrow)"/>
  <path class="d-edge" d="M 430 78 L 430 136" marker-end="url(#py22q5-arrow)"/>
  <path class="d-edge" d="M 480 78 L 700 136" marker-end="url(#py22q5-arrow)"/>
</svg>

The GIL changes hands only *between* bytecode instructions, never in the middle of one. That is the source of both the guarantee people over-trust and the bug they then write.

## 6. What It Means in Practice: CPU-bound vs I/O-bound

📌 **Interview term: CPU-bound vs I/O-bound** — CPU-bound work spends its time computing (parsing, maths, compression in Python code); I/O-bound work spends its time waiting for something outside the program (network, disk, database, sleep).

Example 2 runs on a real 3.12 interpreter (threads cannot start in the browser build of Python, which raises \`RuntimeError: can't start new thread\`):

~~~text
GIL build: True
CPU-bound, 4 threads at least 2x faster: False
I/O-bound, 4 x 0.2 s waits finished in under 0.4 s: True
~~~

On our 4-core run, summing 3 million numbers four times took 0.54 s in a row and 0.49 s with four threads: no real speed-up, because only one thread at a time could run the loop. Four threads that each slept 0.2 s finished in 0.201 s: the waits overlapped completely because sleeping releases the GIL. A \`ProcessPoolExecutor\` with four processes did the same CPU-bound work in 0.20 s, because each process has its own interpreter and its own GIL.

| Workload | Threads under the GIL | Better tool |
| :--- | :--- | :--- |
| Many network calls, file reads, DB queries | Scale well: the GIL is released while waiting | Threads or [asyncio](/interview-question/how-does-async-await-work-in-python) |
| Pure-Python computation | No speed-up; one core at a time | Processes ([ProcessPoolExecutor](/interview-question/how-do-threadpoolexecutor-and-processpoolexecutor-work), [multiprocessing](/interview-question/how-does-multiprocessing-share-data-between-processes)) |
| Heavy work inside C libraries that release the GIL | Can use several cores | Threads are fine |
| CPU-bound on a free-threaded build | Can use several cores | Threads, with proper locking |

The decision guide is in [threading vs multiprocessing vs asyncio](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio), and the underlying distinction in [concurrency vs parallelism](/interview-question/what-is-the-difference-between-concurrency-and-parallelism-in-python).

## 7. The GIL Is Not a Lock for Your Data

Because the GIL can change hands between any two bytecode instructions, anything that takes more than one instruction can be interrupted halfway. Example 1 disassembles \`counter += 1\` on 3.11:

~~~text
['LOAD_GLOBAL', 'LOAD_CONST', 'BINARY_OP', 'STORE_GLOBAL', 'LOAD_CONST', 'RETURN_VALUE']
~~~

Read the global, push 1, add, store the global: four steps (the last two are the function's \`return None\`). If thread B reads \`counter\` after thread A read it but before A stored the new value, both store the same number and one increment is lost.

📌 **Interview term: Race condition** — a bug where the result depends on the exact timing of threads. See [race conditions and locks](/interview-question/what-is-a-race-condition-and-how-do-locks-prevent-it).

📌 **Interview term: Atomic operation** — an operation that cannot be interrupted halfway. Under the GIL a single bytecode is effectively atomic, but almost nothing interesting in your code is a single bytecode.

Example 1 replays the problem deterministically: two generator "threads" do read, add and write as separate steps, and a schedule string decides who runs next:

~~~text
A then B   : (2, ['A wrote 1', 'B wrote 2'])
interleaved: (1, ['A wrote 1', 'B wrote 1'])
A, B, A... : (1, ['A wrote 1', 'B wrote 1'])
~~~

When one thread finishes before the other starts, the count is 2. When the switch lands between a read and a write, both write 1. Example 2 shows the same bug with real threads on 3.12: four threads doing 1,000 unprotected read-sleep-write updates lost updates (\`all 4000 updates kept: False\`), and the same code holding a \`threading.Lock\` around the read-modify-write reached exactly 4000:

~~~text
without a lock, all 4000 updates kept: False
with a lock, counter = 4000
~~~

(The \`time.sleep(0)\` between the read and the write gives the GIL away on purpose, to make the race happen every run; without it the switch is rarer, but it can still happen.)

## 8. Where the GIL Is Going

The GIL has been the subject of decades of proposals. The current path, with version facts checked against the PEPs:

- **3.12 — per-interpreter GIL** ([PEP 684](https://peps.python.org/pep-0684/)): several sub-interpreters inside one process can each have their own GIL and run in parallel. Each interpreter has its own objects, so this is closer to processes-in-one-process than to free threads.
- **3.13 — optional free-threaded build** ([PEP 703](https://peps.python.org/pep-0703/)): a separately compiled CPython with no GIL (on Windows the installer option "Download free-threaded binaries" installs it as \`python3.13t.exe\`, per the [CPython docs](https://git.joshthomas.dev/mirrors/cpython/commit/f56d132deb9fff861439ed56ed7414d22e4e4bb9)), accepted as an explicitly experimental feature. The usual \`python3.13\` keeps the GIL; on our machine \`python3.13 -X gil=0\` refused with \`Disabling the GIL is not supported by this build\`.
- **3.14 — free-threading officially supported** ([PEP 779](https://peps.python.org/pep-0779/), accepted June 2025): no longer labelled experimental, but still an optional build, not the default. Whether it ever becomes the default is left to a future decision.

What changes without the GIL, and when to still prefer processes, are covered in [the free-threaded build](/interview-question/what-is-python-3-12-s-free-threaded-no-gil-build-and-what-changes) and [multiprocessing vs free-threaded threads](/interview-question/when-should-you-still-use-multiprocessing-vs-free-threaded-threads-in-python-3-1). (That page title says 3.12; the free-threaded build itself first shipped in 3.13.) We could not run a free-threaded interpreter for this doc, so no numbers for it are claimed here.

## 9. Verified: Running the Code

Example 1 (reference counts, the bytecode of \`counter += 1\`, the switch interval and a simulated race) runs in the page; on python3.11 and Pyodide it printed:

~~~text
refcount went up by 1
after del, back to the start: True
['LOAD_GLOBAL', 'LOAD_CONST', 'BINARY_OP', 'STORE_GLOBAL', 'LOAD_CONST', 'RETURN_VALUE']
switch interval (seconds): 0.005
A then B   : (2, ['A wrote 1', 'B wrote 2'])
interleaved: (1, ['A wrote 1', 'B wrote 1'])
A, B, A... : (1, ['A wrote 1', 'B wrote 1'])
~~~

Example 2 (real threads, verified on CPython 3.12; booleans instead of timings so the output is stable) printed:

~~~text
GIL build: True
CPU-bound, 4 threads at least 2x faster: False
I/O-bound, 4 x 0.2 s waits finished in under 0.4 s: True
without a lock, all 4000 updates kept: False
with a lock, counter = 4000
~~~

We ran Example 2 three more times on 3.12 and once on 3.11; every run printed the same five lines.

What the output proves:

- Reference counts change on plain assignment, which is the shared state the GIL protects.
- \`counter += 1\` compiles to separate load, add and store instructions, so it is not atomic.
- The default switch interval is 5 ms.
- CPU-bound threads did not run twice as fast, I/O-bound threads overlapped their waits, and only the version with a \`Lock\` kept every update.

## 10. Common Pitfalls

- **"The GIL makes Python code thread-safe."** It protects CPython's internals, not your invariants. \`x += 1\`, check-then-set on a dict, or updating two related fields are all interruptible; use \`threading.Lock\`.
- **Using threads to speed up pure-Python CPU work.** Four threads on four cores give roughly the speed of one. Use processes, a C extension that releases the GIL, or a free-threaded build.
- **Avoiding threads for I/O "because of the GIL".** Blocking I/O releases the GIL; threads (or asyncio) are the right tool for many concurrent network calls.
- **Thinking the GIL is a Python-language feature.** It is a CPython implementation detail; other implementations differ, and CPython itself now ships an optional build without it.
- **Assuming a single \`dict\` or \`list\` operation is always atomic.** Many are, because they are one C call, but an operation that calls back into Python (a custom \`__hash__\`, \`__eq__\` or \`__del__\`) can switch threads in the middle. Do not build correctness on it.
- **Setting a tiny switch interval to "fix" contention.** It increases switching overhead; it does not add parallelism.

## 11. How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-line answer:</strong> <span style="color:#f0e2c8;">The GIL is a mutex in CPython that a thread must hold to run Python bytecode, so <strong style="color:#ffca28;">one interpreter runs one thread of Python code at a time</strong>, even on many cores.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it exists:</strong> <span style="color:#f0e2c8;">Reference counts on every object and much of CPython and its C extensions are not thread-safe; one global lock made them safe simply and keeps single-threaded code fast.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. When it is released:</strong> <span style="color:#f0e2c8;">Around blocking I/O and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time.sleep</code>, inside C code that uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Py_BEGIN_ALLOW_THREADS</code>, and every switch interval (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.getswitchinterval()</code>, 5 ms by default).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Consequence:</strong> <span style="color:#f0e2c8;">Threads help <strong style="color:#ffca28;">I/O-bound</strong> work but not <strong style="color:#ffca28;">CPU-bound</strong> pure Python; use processes or native code for CPU parallelism. The GIL does not protect your data: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counter += 1</code> still needs a lock.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The future:</strong> <span style="color:#f0e2c8;">3.12 added per-interpreter GILs (PEP 684); 3.13 added an optional free-threaded build (PEP 703, experimental), which PEP 779 made officially supported in 3.14, still not the default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If only one thread runs at a time, why do I need locks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the GIL can switch threads between any two bytecodes, and most operations are several bytecodes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">counter += 1</code> is load, add, store; a switch after the load makes two threads store the same value. The GIL protects the interpreter, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Lock</code> protects your invariant.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just remove the GIL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Reference counting and a huge ecosystem of C extensions assume it. Removing it needs thread-safe refcounting and allocation without slowing single-threaded code, which is what PEP 703 does in a separate build, at some single-thread cost and with extensions having to opt in.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does NumPy run in parallel with threads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often yes for the heavy parts: NumPy documents that many of its operations release the GIL, so threads that spend their time in that low-level code run in parallel. Object-dtype operations do not, and Python-level loops around the calls still run one at a time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does asyncio relate to the GIL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">asyncio runs everything on one thread, switching only at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await</code>, so the GIL is irrelevant to it. It solves I/O concurrency with less overhead than threads but gives no CPU parallelism either.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the switch interval and should I change it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The time slice after which a running thread is asked to release the GIL, 5 ms by default, set with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.setswitchinterval</code>. Changing it trades latency for throughput; it rarely fixes anything and never adds parallelism.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Thread | An execution path inside a process; threads share memory |
| Mutex (lock) | An object only one thread can hold at a time |
| Global Interpreter Lock (GIL) | CPython lock that a thread must hold to run Python bytecode |
| Reference count | Per-object counter of references; the main state the GIL protects |
| Switch interval | Time slice before a thread is asked to release the GIL, 5 ms by default |
| CPU-bound vs I/O-bound | Time spent computing versus time spent waiting |
| Race condition | A bug that depends on the timing of threads |
| Atomic operation | An operation that cannot be interrupted halfway |

**Conclusion:** The GIL is a single lock that lets only one thread at a time run Python bytecode inside a CPython interpreter. It exists because reference counting and the C internals were never designed for concurrent access, and it buys simplicity and fast single-threaded code at the cost of CPU parallelism in threads. It is released while a thread waits on I/O, inside C code that opts out, and every 5 ms, which is why threads still work well for I/O-bound programs. It is not a lock for your own data: compound operations like \`counter += 1\` race without a \`threading.Lock\`. For CPU-bound work reach for processes or native code today, and know that CPython is moving towards per-interpreter GILs and an optional free-threaded build that is officially supported from 3.14.`,
    examples: [
      {
        label: `Why the GIL exists and why += still races (simulated)`,
        code: `import dis
import sys

# 1. Why CPython needs a lock at all: every object carries a reference
#    count that changes all the time, with no lock of its own.
data = [1, 2, 3]
before = sys.getrefcount(data)
alias = data
print("refcount went up by", sys.getrefcount(data) - before)
del alias
print("after del, back to the start:", sys.getrefcount(data) == before)

# 2. counter += 1 is several bytecode instructions, not one step
counter = 0
def bump():
    global counter
    counter += 1

ops = [i.opname for i in dis.get_instructions(bump) if i.opname != "RESUME"]
print(ops)

# 3. The GIL gives up the CPU between instructions after a time slice
print("switch interval (seconds):", sys.getswitchinterval())  # switch interval (seconds): 0.005

# 4. Simulate two threads, with the switch landing between the
#    read and the write. Each generator step is one bytecode-sized step.
def thread_body(name, shared, log):
    value = shared["n"]          # LOAD_GLOBAL counter
    yield
    value = value + 1            # BINARY_OP +=
    yield
    shared["n"] = value          # STORE_GLOBAL counter
    log.append(f"{name} wrote {value}")
    yield

def run(schedule):
    shared, log = {"n": 0}, []
    threads = {"A": thread_body("A", shared, log),
               "B": thread_body("B", shared, log)}
    for name in schedule:
        next(threads[name], None)
    return shared["n"], log

print("A then B   :", run("AAABBB"))
print("interleaved:", run("ABABAB"))
print("A, B, A... :", run("ABAABB"))`,
      },
      {
        label: `Real threads: CPU-bound vs I/O-bound, and a lost-update race`,
        code: `import sys
import threading
import time

# Run on a normal (GIL) CPython 3.12 build. Threads cannot start in
# the browser build of Python, so this example is shown as code.
print("GIL build:", not hasattr(sys, "_is_gil_enabled") or sys._is_gil_enabled())

def cpu_work(n=3_000_000):
    total = 0
    for i in range(n):
        total += i
    return total

def timed(fn):
    start = time.perf_counter()
    fn()
    return time.perf_counter() - start

def serial_cpu():
    for _ in range(4):
        cpu_work()

def threaded(target):
    def go():
        threads = [threading.Thread(target=target) for _ in range(4)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
    return go

# CPU-bound: four threads take about as long as doing the work in a row
t_serial = timed(serial_cpu)
t_threads = timed(threaded(cpu_work))
print("CPU-bound, 4 threads at least 2x faster:", t_threads < t_serial / 2)

# I/O-bound: sleeping (like waiting on a socket) releases the GIL,
# so four 0.2 s waits overlap
def wait_io():
    time.sleep(0.2)

t_io = timed(threaded(wait_io))
print("I/O-bound, 4 x 0.2 s waits finished in under 0.4 s:", t_io < 0.4)

# The GIL does not make your code thread-safe: a read, a switch,
# then a write loses updates
counter = 0
def unsafe_add():
    global counter
    for _ in range(1000):
        value = counter
        time.sleep(0)        # gives the GIL away, like a switch would
        counter = value + 1

threaded(unsafe_add)()
print("without a lock, all 4000 updates kept:", counter == 4000)

counter = 0
lock = threading.Lock()
def safe_add():
    global counter
    for _ in range(1000):
        with lock:
            value = counter
            time.sleep(0)
            counter = value + 1

threaded(safe_add)()
print("with a lock, counter =", counter)`,
        runnable: false,
        python: "3.12",
      },
    ],
  },
];

export default augments;
