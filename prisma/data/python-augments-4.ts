import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 4 (internals & memory, the new Q1-10 in
 * curated/python-3.json). Each answer embeds a theme-aware inline
 * <svg class='iq-diagram'> (single-quoted attrs, no backticks, &gt;/&lt; for
 * any angle brackets in prose/text) and closes with "**Interview tip:**", plus
 * one runnable Python example. SVG d-* classes are defined in globals.css.
 */
const augments: PythonAugment[] = [
  {
    title: "How does CPython execute your code?",
    answer:
      "CPython doesn't interpret your source text line by line. It runs a short **compile pipeline** once, then executes **bytecode** on a stack-based virtual machine:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 620 150' role='img' aria-label='CPython pipeline: source to tokens to AST to bytecode to VM'>" +
      "<defs><marker id='py-cp-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='8' y='52' width='86' height='44' rx='8'/><text class='d-text' x='51' y='72' text-anchor='middle'>source</text><text class='d-sub' x='51' y='87' text-anchor='middle'>.py text</text>" +
      "<rect class='d-box-muted' x='128' y='52' width='80' height='44' rx='8'/><text class='d-text' x='168' y='72' text-anchor='middle'>tokens</text><text class='d-sub' x='168' y='87' text-anchor='middle'>lexer</text>" +
      "<rect class='d-box-muted' x='242' y='52' width='80' height='44' rx='8'/><text class='d-text' x='282' y='72' text-anchor='middle'>AST</text><text class='d-sub' x='282' y='87' text-anchor='middle'>parser</text>" +
      "<rect class='d-box-accent' x='356' y='52' width='96' height='44' rx='8'/><text class='d-text' x='404' y='72' text-anchor='middle'>bytecode</text><text class='d-sub' x='404' y='87' text-anchor='middle'>compiler / .pyc</text>" +
      "<rect class='d-box' x='486' y='52' width='118' height='44' rx='8'/><text class='d-text' x='545' y='72' text-anchor='middle'>eval loop</text><text class='d-sub' x='545' y='87' text-anchor='middle'>stack VM</text>" +
      "<line class='d-edge' x1='94' y1='74' x2='126' y2='74' marker-end='url(#py-cp-ar)'/>" +
      "<line class='d-edge' x1='208' y1='74' x2='240' y2='74' marker-end='url(#py-cp-ar)'/>" +
      "<line class='d-edge' x1='322' y1='74' x2='354' y2='74' marker-end='url(#py-cp-ar)'/>" +
      "<line class='d-edge-accent' x1='452' y1='74' x2='484' y2='74' marker-end='url(#py-cp-ar)'/>" +
      "<text class='d-sub' x='310' y='28' text-anchor='middle'>compiled ONCE</text><text class='d-sub' x='545' y='28' text-anchor='middle'>runs each call</text>" +
      "</svg>\n\n" +
      "- **Tokenize / parse:** the source is lexed into tokens and parsed into an **Abstract Syntax Tree**.\n" +
      "- **Compile:** the AST is compiled to **bytecode** — compact instructions for the CPython VM — and cached in `__pycache__/*.pyc` so unchanged modules skip recompilation.\n" +
      "- **Execute:** the **eval loop** (`ceval.c`) runs the bytecode against a per-call **frame** holding a value stack and locals.\n\n" +
      "So Python is *compiled to bytecode, then interpreted* — not 'compiled vs interpreted', but both. The `dis` module lets you see the bytecode for any function.\n\n" +
      "**Interview tip:** say 'CPython compiles source to bytecode (cached as .pyc), then a stack-based VM interprets it.' Mentioning `dis` to inspect bytecode and that `.pyc` is just a compile cache (not a speedup like a JIT) shows real understanding.",
    examples: [
      {
        label: "Disassemble a function to see its bytecode",
        tech: "python",
        code:
          "import dis\n\n" +
          "def add(a, b):\n" +
          "    total = a + b\n" +
          "    return total\n\n" +
          "# The eval loop executes exactly these instructions\n" +
          "dis.dis(add)\n\n" +
          "print(\"---\")\n" +
          "print(\"add(2, 3) =\", add(2, 3))\n" +
          "print(\"code object:\", add.__code__.co_name, add.__code__.co_varnames)",
      },
    ],
  },
  {
    title: "What is the LEGB rule for scope resolution?",
    answer:
      "When you reference a name, Python searches **four nested scopes in order** and uses the **first** match — **LEGB**:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 250' role='img' aria-label='LEGB nested scopes: Local inside Enclosing inside Global inside Built-in'>" +
      "<rect class='d-box-muted' x='10' y='10' width='440' height='230' rx='10'/><text class='d-sub' x='24' y='30'>B — Built-in (print, len, range...)</text>" +
      "<rect class='d-box' x='40' y='44' width='380' height='180' rx='10'/><text class='d-sub' x='54' y='64'>G — Global (module level)</text>" +
      "<rect class='d-box-muted' x='72' y='80' width='316' height='128' rx='10'/><text class='d-sub' x='86' y='100'>E — Enclosing (outer function)</text>" +
      "<rect class='d-box-accent' x='108' y='118' width='244' height='74' rx='10'/><text class='d-text' x='230' y='150' text-anchor='middle'>L — Local</text><text class='d-sub' x='230' y='170' text-anchor='middle'>current function body</text>" +
      "<defs><marker id='py-legb-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-accent d-sub' x='230' y='236' text-anchor='middle'>lookup searches outward L &#8594; E &#8594; G &#8594; B</text>" +
      "</svg>\n\n" +
      "- **Local** — names assigned in the current function.\n" +
      "- **Enclosing** — locals of any outer function(s) wrapping this one (closures).\n" +
      "- **Global** — names at module top level.\n" +
      "- **Built-in** — the always-available names (`len`, `print`, `range`, ...).\n\n" +
      "Two consequences: **assignment** makes a name Local by default (which is why `global`/`nonlocal` exist to rebind outer names), and **shadowing** a built-in (e.g. naming a variable `list`) hides it in that scope.\n\n" +
      "**Interview tip:** recite L-E-G-B and note the search is *read* order; *writing* binds Local unless you declare `global`/`nonlocal`. The classic gotcha to mention is shadowing a built-in like `list` or `id`.",
    examples: [
      {
        label: "The same name resolved at each LEGB level",
        tech: "python",
        code:
          "x = \"global\"\n\n" +
          "def outer():\n" +
          "    x = \"enclosing\"\n" +
          "    def inner():\n" +
          "        x = \"local\"\n" +
          "        print(\"inner sees:\", x)      # Local\n" +
          "    inner()\n" +
          "    print(\"outer sees:\", x)          # Enclosing/Local of outer\n\n" +
          "outer()\n" +
          "print(\"module sees:\", x)              # Global\n" +
          "print(\"builtin len:\", len([1, 2, 3])) # Built-in",
      },
    ],
  },
  {
    title: "How does Python's name and object reference model work?",
    answer:
      "Python has **no variables in the C sense** — there are **objects** (which hold the value and type, on the heap) and **names** that are just labels **bound** to objects. Assignment **never copies**; it points a name at an object:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 460 180' role='img' aria-label='Two names a and b both bound to one list object on the heap'>" +
      "<defs><marker id='py-ref-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='80' y='24' text-anchor='middle'>names</text>" +
      "<rect class='d-box' x='40' y='40' width='80' height='34' rx='6'/><text class='d-text' x='80' y='62' text-anchor='middle'>a</text>" +
      "<rect class='d-box' x='40' y='108' width='80' height='34' rx='6'/><text class='d-text' x='80' y='130' text-anchor='middle'>b</text>" +
      "<text class='d-sub' x='330' y='24' text-anchor='middle'>heap object</text>" +
      "<rect class='d-box-accent' x='260' y='62' width='150' height='58' rx='8'/><text class='d-text' x='335' y='88' text-anchor='middle'>list [1, 2, 3]</text><text class='d-sub' x='335' y='106' text-anchor='middle'>type=list  refcount=2</text>" +
      "<line class='d-edge-accent' x1='120' y1='57' x2='258' y2='82' marker-end='url(#py-ref-ar)'/>" +
      "<line class='d-edge-accent' x1='120' y1='125' x2='258' y2='100' marker-end='url(#py-ref-ar)'/>" +
      "</svg>\n\n" +
      "After `a = [1, 2, 3]; b = a`, **both names reference the same object** (aliasing) — mutating through `b` is visible through `a`. Rebinding `a = something_else` only moves the `a` label; it doesn't affect `b` or the original object.\n\n" +
      "This is sometimes called **'call by object reference'** (or 'call by sharing'): a function receives the *same* object its caller passed, so mutating it is visible, but reassigning the parameter is not.\n\n" +
      "**Interview tip:** the precise framing is 'names are bound to objects; assignment binds, never copies.' Distinguish **mutating** the shared object (visible to all aliases) from **rebinding** a name (local). This is the foundation of the mutable-default and aliasing gotchas.",
    examples: [
      {
        label: "Aliasing via id(): two names, one object",
        tech: "python",
        code:
          "a = [1, 2, 3]\n" +
          "b = a                      # bind b to the SAME object\n" +
          "print(\"same object?\", a is b, \"| id match:\", id(a) == id(b))\n\n" +
          "b.append(4)                # mutate through b...\n" +
          "print(\"a sees it:\", a)     # ...visible through a\n\n" +
          "a = [9, 9]                 # rebinds a only\n" +
          "print(\"after rebind -> a:\", a, \"| b:\", b)",
      },
    ],
  },
  {
    title: "How does attribute lookup work on a Python object?",
    answer:
      "Reading `obj.attr` is not a simple dict peek — Python walks a defined **lookup chain** (driven by `__getattribute__`):\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 440 290' role='img' aria-label='Attribute lookup order from data descriptor down to __getattr__'>" +
      "<defs><marker id='py-attr-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='90' y='10' width='260' height='38' rx='8'/><text class='d-text' x='220' y='29' text-anchor='middle'>1. type data descriptor?</text><text class='d-sub' x='220' y='42' text-anchor='middle'>__get__ + __set__ on the class</text>" +
      "<rect class='d-box' x='90' y='66' width='260' height='38' rx='8'/><text class='d-text' x='220' y='85' text-anchor='middle'>2. instance __dict__</text><text class='d-sub' x='220' y='98' text-anchor='middle'>obj.__dict__['attr']</text>" +
      "<rect class='d-box' x='90' y='122' width='260' height='38' rx='8'/><text class='d-text' x='220' y='141' text-anchor='middle'>3. class + MRO</text><text class='d-sub' x='220' y='154' text-anchor='middle'>non-data descriptor / plain attr</text>" +
      "<rect class='d-box-muted' x='90' y='178' width='260' height='38' rx='8'/><text class='d-text' x='220' y='197' text-anchor='middle'>4. __getattr__ fallback</text><text class='d-sub' x='220' y='210' text-anchor='middle'>only if all above miss</text>" +
      "<rect class='d-box-accent' x='90' y='234' width='260' height='34' rx='8'/><text class='d-text' x='220' y='255' text-anchor='middle'>else AttributeError</text>" +
      "<line class='d-edge' x1='220' y1='48' x2='220' y2='64' marker-end='url(#py-attr-ar)'/>" +
      "<line class='d-edge' x1='220' y1='104' x2='220' y2='120' marker-end='url(#py-attr-ar)'/>" +
      "<line class='d-edge' x1='220' y1='160' x2='220' y2='176' marker-end='url(#py-attr-ar)'/>" +
      "<line class='d-edge' x1='220' y1='216' x2='220' y2='232' marker-end='url(#py-attr-ar)'/>" +
      "</svg>\n\n" +
      "The key subtlety: a **data descriptor** on the class (defines `__get__` *and* `__set__`/`__delete__`, like `property`) **wins over** the instance dict, but a **non-data descriptor** (only `__get__`, like a plain method/function) is **overridden** by an instance attribute of the same name. `__getattr__` runs **only when normal lookup fails**, whereas `__getattribute__` intercepts **every** access.\n\n" +
      "**Interview tip:** the precedence to remember is **data descriptor &gt; instance dict &gt; class/MRO (non-data descriptor) &gt; `__getattr__`**. That ordering is exactly why `property` (a data descriptor) can't be shadowed by an instance attribute but a normal method can.",
    examples: [
      {
        label: "Instance dict shadows a method but not a property",
        tech: "python",
        code:
          "class Demo:\n" +
          "    def greet(self):            # non-data descriptor (function)\n" +
          "        return \"class method\"\n\n" +
          "    @property\n" +
          "    def name(self):             # data descriptor\n" +
          "        return \"class property\"\n\n" +
          "d = Demo()\n" +
          "d.__dict__[\"greet\"] = lambda: \"instance attr\"   # shadows the method\n" +
          "print(\"greet ->\", d.greet())   # instance wins\n\n" +
          "try:\n" +
          "    d.__dict__[\"name\"] = \"instance attr\"\n" +
          "    print(\"name  ->\", d.name)   # property still wins (data descriptor)\n" +
          "except Exception as e:\n" +
          "    print(\"err:\", e)",
      },
    ],
  },
  {
    title: "How does the Python import system work?",
    answer:
      "`import foo` is a **runtime** operation with a cache, not a textual include:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 560 200' role='img' aria-label='Import flow: check sys.modules cache, else find and load and cache'>" +
      "<defs><marker id='py-imp-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='10' y='80' width='110' height='44' rx='8'/><text class='d-text' x='65' y='100' text-anchor='middle'>import foo</text><text class='d-sub' x='65' y='115' text-anchor='middle'>statement</text>" +
      "<rect class='d-box-accent' x='160' y='78' width='120' height='48' rx='8'/><text class='d-text' x='220' y='98' text-anchor='middle'>sys.modules</text><text class='d-sub' x='220' y='114' text-anchor='middle'>cache lookup</text>" +
      "<rect class='d-box-muted' x='320' y='20' width='110' height='44' rx='8'/><text class='d-text' x='375' y='40' text-anchor='middle'>finders</text><text class='d-sub' x='375' y='55' text-anchor='middle'>locate spec</text>" +
      "<rect class='d-box-muted' x='320' y='80' width='110' height='44' rx='8'/><text class='d-text' x='375' y='100' text-anchor='middle'>loader</text><text class='d-sub' x='375' y='115' text-anchor='middle'>exec module</text>" +
      "<rect class='d-box' x='460' y='80' width='92' height='44' rx='8'/><text class='d-text' x='506' y='100' text-anchor='middle'>module</text><text class='d-sub' x='506' y='115' text-anchor='middle'>object</text>" +
      "<line class='d-edge' x1='120' y1='102' x2='158' y2='102' marker-end='url(#py-imp-ar)'/>" +
      "<line class='d-edge-accent' x1='280' y1='86' x2='318' y2='46' marker-end='url(#py-imp-ar)'/>" +
      "<line class='d-edge-accent' x1='280' y1='100' x2='318' y2='100' marker-end='url(#py-imp-ar)'/>" +
      "<line class='d-edge' x1='430' y1='102' x2='458' y2='102' marker-end='url(#py-imp-ar)'/>" +
      "<text class='d-accent d-sub' x='235' y='160' text-anchor='middle'>cache HIT &#8594; return immediately (module runs only once)</text>" +
      "<text class='d-sub' x='375' y='160' text-anchor='middle'>cache MISS &#8594; find, load, store in sys.modules</text>" +
      "</svg>\n\n" +
      "1. **`sys.modules` cache** — if the module is already imported, the cached object is returned immediately. This is why a module's top-level code runs **only once** per process, and how circular imports can partially work.\n" +
      "2. **Finders** walk `sys.meta_path` / `sys.path` to locate the module and produce a *spec*.\n" +
      "3. **Loader** creates the module object, registers it in `sys.modules`, then **executes** the module body to populate it.\n\n" +
      "**Interview tip:** lead with the **`sys.modules` cache** (modules execute once; returns are cached) then 'finders locate, loaders execute.' Mentioning that the cache is what enables circular imports to partially resolve is a strong detail.",
    examples: [
      {
        label: "Re-import hits the cache; top-level runs once",
        tech: "python",
        code:
          "import sys\n\n" +
          "print(\"math cached already?\", \"math\" in sys.modules)\n" +
          "import math\n" +
          "print(\"math cached now?   \", \"math\" in sys.modules)\n\n" +
          "# A second import is just a cache hit -> same object, no re-exec\n" +
          "import math as math_again\n" +
          "print(\"same module object:\", math is math_again)\n\n" +
          "print(\"total modules loaded:\", len(sys.modules))",
      },
    ],
  },
  {
    title: "Why does Python cache small integers?",
    answer:
      "At startup CPython **pre-creates** the integer objects from **−5 to 256** and reuses them everywhere. Any reference to a small int in that range points at the **same cached object**, so allocation is skipped for the most common values:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 180' role='img' aria-label='Small int cache shared, large ints are fresh objects'>" +
      "<defs><marker id='py-int-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='150' y='22' text-anchor='middle'>cached pool (&#8722;5 .. 256)</text>" +
      "<rect class='d-box-accent' x='110' y='34' width='80' height='40' rx='6'/><text class='d-text' x='150' y='59' text-anchor='middle'>int 256</text>" +
      "<rect class='d-box' x='10' y='108' width='70' height='32' rx='6'/><text class='d-text' x='45' y='129' text-anchor='middle'>x = 256</text>" +
      "<rect class='d-box' x='220' y='108' width='70' height='32' rx='6'/><text class='d-text' x='255' y='129' text-anchor='middle'>y = 256</text>" +
      "<line class='d-edge-accent' x1='45' y1='108' x2='130' y2='74' marker-end='url(#py-int-ar)'/>" +
      "<line class='d-edge-accent' x1='255' y1='108' x2='170' y2='74' marker-end='url(#py-int-ar)'/>" +
      "<text class='d-accent d-sub' x='150' y='160' text-anchor='middle'>x is y  &#8594;  True (shared)</text>" +
      "<text class='d-sub' x='430' y='22' text-anchor='middle'>outside the pool</text>" +
      "<rect class='d-box' x='360' y='34' width='66' height='40' rx='6'/><text class='d-text' x='393' y='59' text-anchor='middle'>int 257</text>" +
      "<rect class='d-box' x='452' y='34' width='66' height='40' rx='6'/><text class='d-text' x='485' y='59' text-anchor='middle'>int 257</text>" +
      "<rect class='d-box' x='360' y='108' width='66' height='32' rx='6'/><text class='d-text' x='393' y='129' text-anchor='middle'>a = 257</text>" +
      "<rect class='d-box' x='452' y='108' width='66' height='32' rx='6'/><text class='d-text' x='485' y='129' text-anchor='middle'>b = 257</text>" +
      "<line class='d-edge' x1='393' y1='108' x2='393' y2='76' marker-end='url(#py-int-ar)'/>" +
      "<line class='d-edge' x1='485' y1='108' x2='485' y2='76' marker-end='url(#py-int-ar)'/>" +
      "<text class='d-sub' x='439' y='160' text-anchor='middle'>a is b &#8594; False (two objects)</text>" +
      "</svg>\n\n" +
      "It's a **memory + speed** optimization: small ints are used constantly (loop counters, indices, flags), so sharing them avoids endless tiny allocations. The visible side effect is that **`is` works by luck** for cached ints (`256 is 256` &#8594; True) but not larger ones (`257 is 257` &#8594; usually False). That's exactly why you compare numbers with `==`, never `is`.\n\n" +
      "**Interview tip:** state the **−5..256** range and frame it as an allocation optimization, then connect it to the real lesson: *never use `is` to compare values* — the small-int cache is the canonical reason it sometimes lies.",
    examples: [
      {
        label: "Identity in the cache range vs outside it",
        tech: "python",
        code:
          "x = 256\n" +
          "y = 256\n" +
          "print(\"256 is 256:\", x is y)      # cached -> True\n\n" +
          "a = 257\n" +
          "b = 257\n" +
          "print(\"257 is 257:\", a is b)      # outside cache -> usually False\n\n" +
          "# But VALUE equality is always correct\n" +
          "print(\"257 == 257:\", a == b)\n\n" +
          "# The cached objects are literally reused\n" +
          "print(\"id(1) stable:\", id(1) == id(1))",
      },
    ],
  },
  {
    title: "What is string interning in Python?",
    answer:
      "**Interning** stores a single shared copy of a string in an internal pool, so equal strings can be the **same object**. CPython automatically interns many strings that look like **identifiers** (compile-time literals made of letters/digits/underscores), because they're used heavily as **dict keys** (variable names, attributes):\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 170' role='img' aria-label='Interned string shared by two names; non-interned string is duplicated'>" +
      "<defs><marker id='py-str-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='130' y='20' text-anchor='middle'>intern pool</text>" +
      "<rect class='d-box-accent' x='90' y='30' width='90' height='38' rx='6'/><text class='d-text' x='135' y='54' text-anchor='middle'>'hello'</text>" +
      "<rect class='d-box' x='10' y='110' width='86' height='30' rx='6'/><text class='d-text' x='53' y='130' text-anchor='middle'>a='hello'</text>" +
      "<rect class='d-box' x='170' y='110' width='86' height='30' rx='6'/><text class='d-text' x='213' y='130' text-anchor='middle'>b='hello'</text>" +
      "<line class='d-edge-accent' x1='53' y1='110' x2='115' y2='70' marker-end='url(#py-str-ar)'/>" +
      "<line class='d-edge-accent' x1='213' y1='110' x2='155' y2='70' marker-end='url(#py-str-ar)'/>" +
      "<text class='d-accent d-sub' x='135' y='158' text-anchor='middle'>a is b &#8594; True</text>" +
      "<rect class='d-box' x='320' y='30' width='150' height='38' rx='6'/><text class='d-sub' x='395' y='54' text-anchor='middle'>'hello world!' (x2)</text>" +
      "<rect class='d-box' x='300' y='110' width='80' height='30' rx='6'/><text class='d-sub' x='340' y='130' text-anchor='middle'>built at runtime</text>" +
      "<text class='d-sub' x='395' y='158' text-anchor='middle'>not auto-interned</text>" +
      "</svg>\n\n" +
      "Strings built **at runtime** (concatenation, slicing, user input) are generally **not** interned, so two equal ones may be distinct objects. You can force it with **`sys.intern(s)`**, which is a known optimization when you'll compare or hash the same string millions of times (parsers, tokenizers) — interned strings compare by pointer first.\n\n" +
      "**Interview tip:** 'interning shares one copy of equal strings to speed up identifier/dict-key comparisons.' The takeaway mirrors small ints: *don't compare string values with `is`* — interning is unpredictable; use `==`. Mention `sys.intern` for hot-path optimization.",
    examples: [
      {
        label: "Auto-interned literals vs a runtime-built string",
        tech: "python",
        code:
          "import sys\n\n" +
          "a = \"hello\"\n" +
          "b = \"hello\"\n" +
          "print(\"identifier-like literal:\", a is b)   # usually True\n\n" +
          "# Built at runtime -> not necessarily the same object\n" +
          "c = \"hel\" + \"\".join([\"l\", \"o\"])\n" +
          "print(\"runtime-built is a:\", c is a, \"| equal:\", c == a)\n\n" +
          "# Force interning for hot comparisons\n" +
          "d = sys.intern(c)\n" +
          "print(\"after sys.intern:\", d is a)",
      },
    ],
  },
  {
    title: "How does a Python list grow in memory?",
    answer:
      "A `list` is a **dynamic array**: a contiguous block of **pointers** to objects, plus a length and a (larger) **capacity**. When you `append` past the capacity, CPython allocates a **bigger block** (growing geometrically, not by one), copies the pointers over, and frees the old block:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 170' role='img' aria-label='List over-allocation: capacity grows in jumps as length increases'>" +
      "<text class='d-sub' x='60' y='20' text-anchor='middle'>len 4 / cap 4</text>" +
      "<rect class='d-box-accent' x='14' y='34' width='22' height='30'/><rect class='d-box-accent' x='36' y='34' width='22' height='30'/><rect class='d-box-accent' x='58' y='34' width='22' height='30'/><rect class='d-box-accent' x='80' y='34' width='22' height='30'/>" +
      "<text class='d-sub' x='200' y='20' text-anchor='middle'>append &#8594; len 5 / cap 8</text>" +
      "<rect class='d-box-accent' x='150' y='34' width='20' height='30'/><rect class='d-box-accent' x='170' y='34' width='20' height='30'/><rect class='d-box-accent' x='190' y='34' width='20' height='30'/><rect class='d-box-accent' x='210' y='34' width='20' height='30'/><rect class='d-box-accent' x='230' y='34' width='20' height='30'/>" +
      "<rect class='d-box-muted' x='250' y='34' width='20' height='30'/><rect class='d-box-muted' x='270' y='34' width='20' height='30'/><rect class='d-box-muted' x='290' y='34' width='20' height='30'/>" +
      "<text class='d-sub' x='430' y='20' text-anchor='middle'>grow again &#8594; cap 16</text>" +
      "<rect class='d-box-accent' x='350' y='34' width='14' height='30'/><rect class='d-box-accent' x='364' y='34' width='14' height='30'/><rect class='d-box-accent' x='378' y='34' width='14' height='30'/><rect class='d-box-accent' x='392' y='34' width='14' height='30'/><rect class='d-box-accent' x='406' y='34' width='14' height='30'/><rect class='d-box-accent' x='420' y='34' width='14' height='30'/><rect class='d-box-accent' x='434' y='34' width='14' height='30'/><rect class='d-box-accent' x='448' y='34' width='14' height='30'/><rect class='d-box-accent' x='462' y='34' width='14' height='30'/>" +
      "<rect class='d-box-muted' x='476' y='34' width='14' height='30'/><rect class='d-box-muted' x='490' y='34' width='14' height='30'/>" +
      "<text class='d-sub' x='110' y='110' text-anchor='middle'>filled slot</text><rect class='d-box-accent' x='60' y='98' width='16' height='16'/>" +
      "<text class='d-sub' x='300' y='110' text-anchor='middle'>spare capacity</text><rect class='d-box-muted' x='250' y='98' width='16' height='16'/>" +
      "<text class='d-accent d-sub' x='260' y='150' text-anchor='middle'>spare slots make append amortized O(1); a fresh resize is the occasional O(n) copy</text>" +
      "</svg>\n\n" +
      "Because it **over-allocates** (the growth pattern is roughly 0, 4, 8, 16, 25, ...), most appends just drop into a pre-reserved slot — making `append` **amortized O(1)** even though an individual resize is O(n). Indexing is O(1); inserting/deleting at the **front** is O(n) (everything shifts) — that's when you reach for `deque`.\n\n" +
      "**Interview tip:** the headline is **amortized O(1) append via geometric over-allocation**. Add the contrast: index O(1), front insert/pop O(n) (use `collections.deque`), and that a list stores **pointers**, so it's bigger than a packed array (use `array`/NumPy for numeric bulk).",
    examples: [
      {
        label: "Watch capacity jump as the list grows",
        tech: "python",
        code:
          "import sys\n\n" +
          "lst = []\n" +
          "last = -1\n" +
          "for i in range(17):\n" +
          "    size = sys.getsizeof(lst)\n" +
          "    if size != last:                       # capacity changed\n" +
          "        print(f\"len={len(lst):>2}  bytes={size}\")\n" +
          "        last = size\n" +
          "    lst.append(i)\n\n" +
          "print(\"index is O(1):\", lst[10])",
      },
    ],
  },
  {
    title: "How does a Python set find items?",
    answer:
      "A `set` (and the keys of a `dict`) is a **hash table using open addressing**. To store or find an element, Python computes `hash(x)`, maps it to a **slot** in the internal array, and if that slot is taken by a *different* item (a **collision**), it **probes** other slots in a fixed sequence until it finds the item or an empty slot:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 520 200' role='img' aria-label='Open addressing: element hashed to a slot, probes forward on collision'>" +
      "<defs><marker id='py-set-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='260' y='20' text-anchor='middle'>internal slot array</text>" +
      "<rect class='d-box' x='40' y='40' width='60' height='40'/><text class='d-sub' x='70' y='64' text-anchor='middle'>0 empty</text>" +
      "<rect class='d-box-accent' x='100' y='40' width='60' height='40'/><text class='d-sub' x='130' y='64' text-anchor='middle'>1 'cat'</text>" +
      "<rect class='d-box-accent' x='160' y='40' width='60' height='40'/><text class='d-sub' x='190' y='64' text-anchor='middle'>2 'dog'</text>" +
      "<rect class='d-box' x='220' y='40' width='60' height='40'/><text class='d-sub' x='250' y='64' text-anchor='middle'>3 empty</text>" +
      "<rect class='d-box-accent' x='280' y='40' width='60' height='40'/><text class='d-sub' x='310' y='64' text-anchor='middle'>4 'fox'</text>" +
      "<rect class='d-box' x='340' y='40' width='60' height='40'/><text class='d-sub' x='370' y='64' text-anchor='middle'>5 empty</text>" +
      "<text class='d-text' x='130' y='118' text-anchor='middle'>add 'dog'</text><text class='d-sub' x='130' y='134' text-anchor='middle'>hash &#8594; slot 1</text>" +
      "<line class='d-edge-accent' x1='130' y1='100' x2='130' y2='82' marker-end='url(#py-set-ar)'/>" +
      "<text class='d-sub' x='130' y='150' text-anchor='middle'>taken by 'cat'!</text>" +
      "<line class='d-edge-dashed' x1='150' y1='106' x2='185' y2='106' marker-end='url(#py-set-ar)'/>" +
      "<text class='d-accent d-sub' x='200' y='118'>probe &#8594; slot 2 free &#8594; store</text>" +
      "<text class='d-accent d-sub' x='260' y='185' text-anchor='middle'>average O(1) lookup/insert; collisions probe; resize keeps the table sparse</text>" +
      "</svg>\n\n" +
      "Membership (`x in s`) is **average O(1)**: hash to a slot and check it (plus a few probes). Elements must be **hashable** (immutable-by-value), and the table is kept under ~2/3 full by resizing so collisions stay rare. Sets are unordered because slot position depends on hashes, not insertion.\n\n" +
      "**Interview tip:** 'hash table with open addressing — average O(1) membership; collisions are resolved by probing.' Tie it to practice: converting a list to a set before many `in` checks turns O(n) lookups into O(1), and elements must be hashable.",
    examples: [
      {
        label: "O(1) set membership vs O(n) list scan",
        tech: "python",
        code:
          "import time\n\n" +
          "n = 200_000\n" +
          "as_list = list(range(n))\n" +
          "as_set = set(as_list)\n" +
          "needle = n - 1           # worst case for the list\n\n" +
          "t = time.perf_counter()\n" +
          "_ = needle in as_list    # scans ~n items\n" +
          "print(f\"list  in: {(time.perf_counter()-t)*1000:.3f} ms\")\n\n" +
          "t = time.perf_counter()\n" +
          "_ = needle in as_set     # hash to a slot\n" +
          "print(f\"set   in: {(time.perf_counter()-t)*1000:.4f} ms\")\n\n" +
          "# elements must be hashable\n" +
          "try:\n" +
          "    {[1, 2]}\n" +
          "except TypeError as e:\n" +
          "    print(\"unhashable:\", e)",
      },
    ],
  },
  {
    title: "What is the difference between the call stack and the heap in Python?",
    answer:
      "Memory splits into two regions with different jobs:\n\n" +
      "- The **call stack** holds one **frame** per active function call. A frame stores that call's **local names**, arguments, and where to return. Frames are pushed on call and popped on return — strictly LIFO.\n" +
      "- The **heap** holds **all the objects** themselves (ints, lists, instances, functions). It's managed by the allocator + garbage collector and has no ordering.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 200' role='img' aria-label='Call stack frames hold names that reference objects living on the heap'>" +
      "<defs><marker id='py-sh-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='95' y='18' text-anchor='middle'>call stack (frames)</text>" +
      "<rect class='d-box' x='20' y='28' width='150' height='34' rx='6'/><text class='d-sub' x='95' y='49' text-anchor='middle'>main(): data</text>" +
      "<rect class='d-box' x='20' y='66' width='150' height='34' rx='6'/><text class='d-sub' x='95' y='87' text-anchor='middle'>process(): items</text>" +
      "<rect class='d-box-accent' x='20' y='104' width='150' height='34' rx='6'/><text class='d-sub' x='95' y='125' text-anchor='middle'>helper(): x  &#8592; top</text>" +
      "<text class='d-sub' x='380' y='18' text-anchor='middle'>heap (objects)</text>" +
      "<rect class='d-box-accent' x='320' y='30' width='120' height='30' rx='6'/><text class='d-sub' x='380' y='50' text-anchor='middle'>list [...]</text>" +
      "<rect class='d-box-accent' x='320' y='74' width='120' height='30' rx='6'/><text class='d-sub' x='380' y='94' text-anchor='middle'>dict {...}</text>" +
      "<rect class='d-box-accent' x='320' y='118' width='120' height='30' rx='6'/><text class='d-sub' x='380' y='138' text-anchor='middle'>int 42</text>" +
      "<line class='d-edge' x1='170' y1='45' x2='318' y2='45' marker-end='url(#py-sh-ar)'/>" +
      "<line class='d-edge' x1='170' y1='83' x2='318' y2='86' marker-end='url(#py-sh-ar)'/>" +
      "<line class='d-edge' x1='170' y1='121' x2='318' y2='130' marker-end='url(#py-sh-ar)'/>" +
      "<text class='d-sub' x='250' y='178' text-anchor='middle'>names live in frames; the objects they point to all live on the heap</text>" +
      "</svg>\n\n" +
      "So in Python **everything is a heap object**; the stack only holds **frames whose locals are *references* to those objects**. This explains a few things: deep/infinite recursion raises **`RecursionError`** (the stack is bounded — see `sys.getrecursionlimit()`); a local name vanishes when its frame pops, but the object survives if something else still references it (e.g. a returned value or a closure); and an object outlives the call that created it precisely when another reference keeps it alive.\n\n" +
      "**Interview tip:** 'stack = per-call frames holding local *names*; heap = the actual objects. Names reference heap objects.' Connect it to **`RecursionError`** (bounded stack) and to why a returned/closed-over object outlives its frame — that links the concept to observable behavior.",
    examples: [
      {
        label: "Frames stack up; the object outlives its frame",
        tech: "python",
        code:
          "import sys\n\n" +
          "def depth(n):\n" +
          "    # each call pushes a new frame onto the call stack\n" +
          "    return 1 if n == 0 else 1 + depth(n - 1)\n\n" +
          "print(\"recursion limit:\", sys.getrecursionlimit())\n" +
          "print(\"depth(100):\", depth(100))\n\n" +
          "def make_list():\n" +
          "    local = [1, 2, 3]      # name 'local' lives in this frame...\n" +
          "    return local           # ...but the heap object is returned\n\n" +
          "kept = make_list()         # frame popped; object survives via 'kept'\n" +
          "print(\"object outlived its frame:\", kept)\n\n" +
          "try:\n" +
          "    depth(10_000)          # blow the bounded stack\n" +
          "except RecursionError:\n" +
          "    print(\"RecursionError: the stack is finite\")",
      },
    ],
  },
];

export default augments;
