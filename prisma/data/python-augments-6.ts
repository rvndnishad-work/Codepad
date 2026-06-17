import type { PythonAugment } from "./python-augments.types";

/**
 * Python augments — batch 6 (OOP, Q21-28 in curated/python-3.json).
 * Answer + theme-aware inline SVG + "**Interview tip:**" + runnable example.
 */
const augments: PythonAugment[] = [
  {
    title: "What is the difference between class variables and instance variables?",
    answer:
      "- A **class variable** is defined in the class body and **stored once on the class** — shared by every instance.\n" +
      "- An **instance variable** is set on an instance (usually `self.x = ...` in `__init__`) and lives in that instance's **`__dict__`** — unique per object.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 180' role='img' aria-label='One class variable shared; each instance has its own instance variable'>" +
      "<defs><marker id='py-cv-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='180' y='10' width='150' height='46' rx='8'/><text class='d-text' x='255' y='30' text-anchor='middle'>Dog (class)</text><text class='d-sub' x='255' y='46' text-anchor='middle'>species = 'canis'  (shared)</text>" +
      "<rect class='d-box' x='30' y='110' width='160' height='52' rx='8'/><text class='d-text' x='110' y='132' text-anchor='middle'>rex</text><text class='d-sub' x='110' y='148' text-anchor='middle'>name = 'Rex'</text>" +
      "<rect class='d-box' x='320' y='110' width='160' height='52' rx='8'/><text class='d-text' x='400' y='132' text-anchor='middle'>fido</text><text class='d-sub' x='400' y='148' text-anchor='middle'>name = 'Fido'</text>" +
      "<line class='d-edge-accent' x1='200' y1='52' x2='130' y2='108' marker-end='url(#py-cv-ar)'/>" +
      "<line class='d-edge-accent' x1='310' y1='52' x2='380' y2='108' marker-end='url(#py-cv-ar)'/>" +
      "<text class='d-sub' x='255' y='92' text-anchor='middle'>both read the same species; each has its own name</text>" +
      "</svg>\n\n" +
      "Reading `self.x` finds the instance value if present, else falls back to the class value. The classic trap: **assigning** `self.x = v` always creates/updates an *instance* variable (shadowing the class one) — it never mutates the shared class variable. And a **mutable class variable** (e.g. a class-level `[]`) is shared, so `self.items.append(...)` leaks across instances — the OOP cousin of the mutable-default bug. Initialize per-instance mutable state in `__init__`.\n\n" +
      "**Interview tip:** 'class var = one shared copy on the class; instance var = per-object in `__dict__`.' The high-value warning is the **mutable class variable** sharing state across instances — interviewers love that gotcha; the fix is to assign it in `__init__`.",
    examples: [
      {
        label: "Shared class var, shadowing, and the mutable trap",
        tech: "python",
        code:
          "class Dog:\n" +
          "    species = \"canis\"          # class variable (shared)\n" +
          "    tricks = []                # MUTABLE class var -> shared! (bug)\n\n" +
          "    def __init__(self, name):\n" +
          "        self.name = name       # instance variable (per object)\n\n" +
          "rex, fido = Dog(\"Rex\"), Dog(\"Fido\")\n" +
          "print(\"shared species:\", rex.species, fido.species)\n\n" +
          "rex.tricks.append(\"sit\")       # mutates the shared list\n" +
          "print(\"fido sees rex's trick:\", fido.tricks)   # leaked!\n\n" +
          "rex.species = \"wolf\"           # assignment shadows on the instance\n" +
          "print(\"rex:\", rex.species, \"| fido:\", fido.species, \"| class:\", Dog.species)",
      },
    ],
  },
  {
    title: "What are mixins in Python?",
    answer:
      "A **mixin** is a small class that bundles a focused piece of behavior to be **mixed into** other classes via multiple inheritance. It's not meant to be instantiated on its own and usually holds **no state** — it just contributes methods that assume the host class provides certain attributes:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 170' role='img' aria-label='Two mixins combine with a base class to form a composed class'>" +
      "<defs><marker id='py-mix-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-muted' x='20' y='14' width='130' height='42' rx='8'/><text class='d-text' x='85' y='35' text-anchor='middle'>JsonMixin</text><text class='d-sub' x='85' y='50' text-anchor='middle'>to_json()</text>" +
      "<rect class='d-box-muted' x='20' y='114' width='130' height='42' rx='8'/><text class='d-text' x='85' y='135' text-anchor='middle'>ReprMixin</text><text class='d-sub' x='85' y='150' text-anchor='middle'>__repr__()</text>" +
      "<rect class='d-box' x='190' y='64' width='120' height='42' rx='8'/><text class='d-text' x='250' y='85' text-anchor='middle'>User (base)</text><text class='d-sub' x='250' y='100' text-anchor='middle'>data</text>" +
      "<rect class='d-box-accent' x='360' y='64' width='130' height='42' rx='8'/><text class='d-text' x='425' y='85' text-anchor='middle'>User(+mixins)</text><text class='d-sub' x='425' y='100' text-anchor='middle'>gains both</text>" +
      "<line class='d-edge' x1='150' y1='40' x2='358' y2='76' marker-end='url(#py-mix-ar)'/>" +
      "<line class='d-edge' x1='150' y1='132' x2='358' y2='96' marker-end='url(#py-mix-ar)'/>" +
      "<line class='d-edge' x1='310' y1='85' x2='358' y2='85' marker-end='url(#py-mix-ar)'/>" +
      "</svg>\n\n" +
      "Mixins enable **composable, reusable behavior** without deep hierarchies — Django uses them heavily (`LoginRequiredMixin`, view mixins). They rely on the **MRO** and cooperative `super()`. Order matters: list mixins **before** the base class (`class User(JsonMixin, ReprMixin, Base)`) so their methods take precedence. Keep them small and orthogonal; if a mixin needs lots of its own state, composition is usually cleaner.\n\n" +
      "**Interview tip:** 'a stateless, focused class added via multiple inheritance to grant behavior, not meant to stand alone.' Mention MRO ordering (mixins first) and a real example (Django mixins) — and contrast with composition for stateful needs.",
    examples: [
      {
        label: "Mixins add behavior to a host class",
        tech: "python",
        code:
          "class DictReprMixin:\n" +
          "    def __repr__(self):\n" +
          "        return f\"{type(self).__name__}({self.__dict__})\"\n\n" +
          "class JsonMixin:\n" +
          "    def to_json(self):\n" +
          "        import json\n" +
          "        return json.dumps(self.__dict__)\n\n" +
          "class User(DictReprMixin, JsonMixin):    # mixins first\n" +
          "    def __init__(self, name, age):\n" +
          "        self.name, self.age = name, age\n\n" +
          "u = User(\"Ada\", 36)\n" +
          "print(\"repr:\", u)               # from DictReprMixin\n" +
          "print(\"json:\", u.to_json())     # from JsonMixin\n" +
          "print(\"MRO :\", [c.__name__ for c in User.__mro__])",
      },
    ],
  },
  {
    title: "What is duck typing in Python?",
    answer:
      "**Duck typing**: 'if it walks like a duck and quacks like a duck, treat it as a duck.' Python cares about an object's **behavior (the methods/attributes it actually has)**, not its declared class. Code calls the methods it needs; **any** object that implements them works — no shared base class or interface required:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 160' role='img' aria-label='Different unrelated classes all satisfy a function because they have the needed method'>" +
      "<defs><marker id='py-duck-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='14' width='120' height='34' rx='8'/><text class='d-text' x='80' y='36' text-anchor='middle'>Duck.quack()</text>" +
      "<rect class='d-box' x='20' y='62' width='120' height='34' rx='8'/><text class='d-text' x='80' y='84' text-anchor='middle'>Person.quack()</text>" +
      "<rect class='d-box' x='20' y='110' width='120' height='34' rx='8'/><text class='d-text' x='80' y='132' text-anchor='middle'>Robot.quack()</text>" +
      "<rect class='d-box-accent' x='300' y='58' width='180' height='44' rx='8'/><text class='d-text' x='390' y='78' text-anchor='middle'>make_it_quack(x)</text><text class='d-sub' x='390' y='94' text-anchor='middle'>just calls x.quack()</text>" +
      "<line class='d-edge' x1='140' y1='31' x2='298' y2='72' marker-end='url(#py-duck-ar)'/>" +
      "<line class='d-edge' x1='140' y1='79' x2='298' y2='80' marker-end='url(#py-duck-ar)'/>" +
      "<line class='d-edge' x1='140' y1='127' x2='298' y2='88' marker-end='url(#py-duck-ar)'/>" +
      "<text class='d-sub' x='390' y='130' text-anchor='middle'>no shared base class needed</text>" +
      "</svg>\n\n" +
      "This is why Python protocols are powerful with little ceremony: file-likes (anything with `.read()`), iterables (anything with `__iter__`), context managers (`__enter__`/`__exit__`). It pairs with **EAFP** — just call the method and handle the exception if it's missing. For **static** checking of duck-typed code, `typing.Protocol` expresses the required shape without inheritance. The trade-off: errors surface at **call time**, not via the type system.\n\n" +
      "**Interview tip:** 'suitability is decided by behavior, not type.' Tie it to real protocols (file-like, iterable) and to **EAFP**. Mentioning `typing.Protocol` as the static-typing counterpart of duck typing is the modern, senior touch.",
    examples: [
      {
        label: "Unrelated classes work if they share the method",
        tech: "python",
        code:
          "class Duck:\n" +
          "    def quack(self): return \"Quack!\"\n\n" +
          "class Person:\n" +
          "    def quack(self): return \"(imitates a duck)\"\n\n" +
          "class Dog:\n" +
          "    def bark(self): return \"Woof\"\n\n" +
          "def make_it_quack(x):\n" +
          "    return x.quack()            # no isinstance check\n\n" +
          "for thing in (Duck(), Person()):\n" +
          "    print(make_it_quack(thing))\n\n" +
          "# EAFP: try the behavior, handle absence\n" +
          "try:\n" +
          "    make_it_quack(Dog())\n" +
          "except AttributeError as e:\n" +
          "    print(\"not a duck:\", e)",
      },
    ],
  },
  {
    title: "What is monkey patching in Python?",
    answer:
      "**Monkey patching** is replacing or adding attributes/methods on a class, module, or instance **at runtime**, after it's defined. Because Python objects are mutable namespaces, you can simply assign over an existing name and every later reference sees the new version:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='Original method on a class swapped at runtime for a patched one'>" +
      "<defs><marker id='py-mp-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-muted' x='30' y='50' width='150' height='48' rx='8'/><text class='d-text' x='105' y='72' text-anchor='middle'>Class.method</text><text class='d-sub' x='105' y='88' text-anchor='middle'>original</text>" +
      "<rect class='d-box-accent' x='300' y='50' width='150' height='48' rx='8'/><text class='d-text' x='375' y='72' text-anchor='middle'>Class.method</text><text class='d-sub' x='375' y='88' text-anchor='middle'>patched at runtime</text>" +
      "<line class='d-edge-accent' x1='180' y1='74' x2='298' y2='74' marker-end='url(#py-mp-ar)'/>" +
      "<text class='d-accent d-sub' x='240' y='40' text-anchor='middle'>Class.method = new_func</text>" +
      "<text class='d-sub' x='240' y='128' text-anchor='middle'>all later calls use the replacement</text>" +
      "</svg>\n\n" +
      "Legitimate uses: **testing** (`unittest.mock.patch` swaps a dependency for the test, then restores it), applying a **hotfix** to third-party code you can't edit, or adding compatibility shims. The cost is high: it's **action at a distance** — code behaves differently than its source reads, breaks on library upgrades, and creates spooky bugs. Restrict it to tests (with automatic restore) and last-resort fixes; never use it for normal program structure.\n\n" +
      "**Interview tip:** 'dynamically replacing attributes at runtime.' Lead with the legitimate case — **mocking in tests** (`mock.patch`, which restores afterward) — then flag the maintainability danger. Showing you'd prefer DI/subclassing over patching in production code reads as senior.",
    examples: [
      {
        label: "Patch a method, then restore it",
        tech: "python",
        code:
          "class Service:\n" +
          "    def fetch(self):\n" +
          "        return \"REAL network call\"\n\n" +
          "s = Service()\n" +
          "print(\"before:\", s.fetch())\n\n" +
          "# Monkey patch for a test: swap in a fake\n" +
          "original = Service.fetch\n" +
          "Service.fetch = lambda self: \"FAKE response\"\n" +
          "print(\"patched:\", s.fetch())\n\n" +
          "# Always restore (mock.patch does this automatically)\n" +
          "Service.fetch = original\n" +
          "print(\"restored:\", s.fetch())",
      },
    ],
  },
  {
    title: "What is composition versus inheritance?",
    answer:
      "Two ways to reuse and combine behavior:\n\n" +
      "- **Inheritance ('is-a')** — a subclass extends a base and inherits its implementation. Tight coupling; great for genuine specialization.\n" +
      "- **Composition ('has-a')** — a class **holds** other objects and delegates to them. Looser coupling; behavior is assembled from parts you can swap at runtime.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 180' role='img' aria-label='Inheritance is-a tree versus composition has-a holding parts'>" +
      "<defs><marker id='py-ci-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='120' y='18' text-anchor='middle'>Inheritance (is-a)</text>" +
      "<rect class='d-box' x='70' y='30' width='100' height='34' rx='6'/><text class='d-text' x='120' y='52' text-anchor='middle'>Animal</text>" +
      "<rect class='d-box-accent' x='70' y='110' width='100' height='34' rx='6'/><text class='d-text' x='120' y='132' text-anchor='middle'>Dog</text>" +
      "<line class='d-edge' x1='120' y1='110' x2='120' y2='66' marker-end='url(#py-ci-ar)'/><text class='d-sub' x='150' y='90'>is-a</text>" +
      "<line class='d-edge-dashed' x1='250' y1='20' x2='250' y2='160'/>" +
      "<text class='d-sub' x='390' y='18' text-anchor='middle'>Composition (has-a)</text>" +
      "<rect class='d-box-accent' x='340' y='30' width='110' height='34' rx='6'/><text class='d-text' x='395' y='52' text-anchor='middle'>Car</text>" +
      "<rect class='d-box' x='300' y='110' width='90' height='34' rx='6'/><text class='d-text' x='345' y='132' text-anchor='middle'>Engine</text>" +
      "<rect class='d-box' x='400' y='110' width='90' height='34' rx='6'/><text class='d-text' x='445' y='132' text-anchor='middle'>GPS</text>" +
      "<line class='d-edge' x1='370' y1='64' x2='350' y2='108' marker-end='url(#py-ci-ar)'/>" +
      "<line class='d-edge' x1='420' y1='64' x2='440' y2='108' marker-end='url(#py-ci-ar)'/>" +
      "<text class='d-sub' x='395' y='168' text-anchor='middle'>has-a parts</text>" +
      "</svg>\n\n" +
      "The guidance **'favor composition over inheritance'** exists because deep inheritance is rigid (fragile base class, the diamond/MRO complexity, behavior locked at class-definition time). Composition lets you inject and swap collaborators (great for testing via dependency injection) and avoids hierarchy lock-in. Use inheritance for true 'is-a' specialization or framework hooks; reach for composition (or mixins) to assemble capabilities.\n\n" +
      "**Interview tip:** 'is-a vs has-a', then the maxim **favor composition over inheritance** with *why*: looser coupling, runtime swappability, easier testing, and avoiding fragile/deep hierarchies. Note inheritance still wins for genuine specialization — it's a judgment call, not a rule.",
    examples: [
      {
        label: "Same capability via inheritance vs composition",
        tech: "python",
        code:
          "# Composition: Car HAS-A engine it delegates to (swappable)\n" +
          "class ElectricEngine:\n" +
          "    def start(self): return \"silent whirr\"\n\n" +
          "class GasEngine:\n" +
          "    def start(self): return \"vroom\"\n\n" +
          "class Car:\n" +
          "    def __init__(self, engine):\n" +
          "        self.engine = engine          # injected collaborator\n" +
          "    def drive(self):\n" +
          "        return \"car goes: \" + self.engine.start()\n\n" +
          "print(Car(ElectricEngine()).drive())\n" +
          "print(Car(GasEngine()).drive())        # swap behavior at runtime\n\n" +
          "# Inheritance: Dog IS-A Animal\n" +
          "class Animal:\n" +
          "    def breathe(self): return \"breathing\"\n" +
          "class Dog(Animal):\n" +
          "    def bark(self): return \"woof\"\n" +
          "d = Dog()\n" +
          "print(d.breathe(), \"+\", d.bark())",
      },
    ],
  },
  {
    title: "What are generics and TypeVar in Python?",
    answer:
      "**Generics** let a function or class be **parameterized over a type** so static checkers (mypy/pyright) can preserve the relationship between inputs and outputs. A **`TypeVar`** is a placeholder for 'some specific type, consistent within this call':\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='TypeVar T binds to the concrete type at each call site'>" +
      "<defs><marker id='py-gen-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='170' y='52' width='160' height='46' rx='8'/><text class='d-text' x='250' y='73' text-anchor='middle'>first(x: list[T]) -&gt; T</text><text class='d-sub' x='250' y='89' text-anchor='middle'>generic signature</text>" +
      "<rect class='d-box' x='10' y='14' width='130' height='34' rx='6'/><text class='d-sub' x='75' y='35' text-anchor='middle'>list[int] &#8594; T=int</text>" +
      "<rect class='d-box' x='10' y='102' width='130' height='34' rx='6'/><text class='d-sub' x='75' y='123' text-anchor='middle'>list[str] &#8594; T=str</text>" +
      "<line class='d-edge' x1='140' y1='31' x2='190' y2='58' marker-end='url(#py-gen-ar)'/>" +
      "<line class='d-edge' x1='140' y1='119' x2='190' y2='92' marker-end='url(#py-gen-ar)'/>" +
      "<rect class='d-box' x='360' y='14' width='130' height='34' rx='6'/><text class='d-sub' x='425' y='35' text-anchor='middle'>returns int</text>" +
      "<rect class='d-box' x='360' y='102' width='130' height='34' rx='6'/><text class='d-sub' x='425' y='123' text-anchor='middle'>returns str</text>" +
      "<line class='d-edge' x1='330' y1='66' x2='358' y2='38' marker-end='url(#py-gen-ar)'/>" +
      "<line class='d-edge' x1='330' y1='84' x2='358' y2='114' marker-end='url(#py-gen-ar)'/>" +
      "</svg>\n\n" +
      "`def first(items: list[T]) -> T` tells the checker the return type **matches the element type** of the argument — call it with `list[int]` and the result is known to be `int`. You can **bound** a TypeVar (`TypeVar('N', bound=Number)`) or constrain it to specific types, and make generic **classes** via `Generic[T]` (or the 3.12 `class Stack[T]:` syntax). It's purely a **static** aid — erased at runtime.\n\n" +
      "**Interview tip:** 'a TypeVar parameterizes a function/class over a type so the checker links input and output types.' Stress it's compile-time only (no runtime effect), and mention `bound=`/constraints and the clean 3.12 `def f[T](...)` syntax to sound current.",
    examples: [
      {
        label: "A TypeVar links input element type to the return type",
        tech: "python",
        code:
          "from typing import TypeVar\n\n" +
          "T = TypeVar(\"T\")\n\n" +
          "def first(items: list[T]) -> T:\n" +
          "    return items[0]\n\n" +
          "# At runtime it just works; a type checker knows the precise types:\n" +
          "n = first([10, 20, 30])     # checker infers int\n" +
          "s = first([\"a\", \"b\"])       # checker infers str\n" +
          "print(\"int result:\", n, type(n).__name__)\n" +
          "print(\"str result:\", s, type(s).__name__)\n\n" +
          "# Bounded TypeVar: must be a subtype of int/float\n" +
          "Num = TypeVar(\"Num\", int, float)\n" +
          "def double(x: Num) -> Num:\n" +
          "    return x + x\n" +
          "print(\"double:\", double(3), double(2.5))",
      },
    ],
  },
  {
    title: "What is __init_subclass__ in Python?",
    answer:
      "**`__init_subclass__`** is an implicit **classmethod** on a base class that Python calls **every time a subclass is defined** (not when instances are created). It's a lightweight hook for **validating or registering** subclasses — most of what people used to reach for a metaclass to do, with far less complexity:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 150' role='img' aria-label='Defining each subclass triggers the base __init_subclass__ hook'>" +
      "<defs><marker id='py-isc-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box-accent' x='180' y='52' width='150' height='46' rx='8'/><text class='d-text' x='255' y='72' text-anchor='middle'>Base</text><text class='d-sub' x='255' y='88' text-anchor='middle'>__init_subclass__</text>" +
      "<rect class='d-box' x='20' y='14' width='120' height='34' rx='6'/><text class='d-text' x='80' y='36' text-anchor='middle'>class A(Base)</text>" +
      "<rect class='d-box' x='20' y='102' width='120' height='34' rx='6'/><text class='d-text' x='80' y='124' text-anchor='middle'>class B(Base)</text>" +
      "<line class='d-edge-accent' x1='140' y1='31' x2='200' y2='58' marker-end='url(#py-isc-ar)'/><text class='d-sub' x='165' y='34'>hook fires</text>" +
      "<line class='d-edge-accent' x1='140' y1='119' x2='200' y2='92' marker-end='url(#py-isc-ar)'/>" +
      "<rect class='d-box-muted' x='380' y='52' width='110' height='46' rx='8'/><text class='d-text' x='435' y='72' text-anchor='middle'>registry</text><text class='d-sub' x='435' y='88' text-anchor='middle'>{A, B}</text>" +
      "<line class='d-edge' x1='330' y1='75' x2='378' y2='75' marker-end='url(#py-isc-ar)'/>" +
      "</svg>\n\n" +
      "Define `def __init_subclass__(cls, **kwargs)` on the base; each subclass triggers it with `cls` bound to the new subclass. Use it to auto-register plugins, enforce that required attributes/methods exist, or accept **class keyword arguments** (`class Plugin(Base, name='csv')` is passed into the hook). It's simpler than a metaclass and composes through inheritance.\n\n" +
      "**Interview tip:** 'a base-class hook run at *subclass definition* time, for validation/registration — a simpler alternative to a metaclass.' Mentioning that it can capture class kwargs (`class X(Base, key=val)`) and that it's the modern preference over metaclasses is the standout.",
    examples: [
      {
        label: "Auto-register and validate subclasses",
        tech: "python",
        code:
          "class Exporter:\n" +
          "    registry = {}\n\n" +
          "    def __init_subclass__(cls, format, **kwargs):\n" +
          "        super().__init_subclass__(**kwargs)\n" +
          "        if not hasattr(cls, \"export\"):\n" +
          "            raise TypeError(f\"{cls.__name__} must define export()\")\n" +
          "        Exporter.registry[format] = cls    # auto-register\n" +
          "        print(\"registered:\", format)\n\n" +
          "class CsvExporter(Exporter, format=\"csv\"):\n" +
          "    def export(self): return \"a,b,c\"\n\n" +
          "class JsonExporter(Exporter, format=\"json\"):\n" +
          "    def export(self): return '{\"a\": 1}'\n\n" +
          "print(\"registry:\", list(Exporter.registry))\n" +
          "print(\"use:\", Exporter.registry[\"csv\"]().export())",
      },
    ],
  },
  {
    title: "What is the difference between __repr__ and __str__?",
    answer:
      "Two string conversions with different audiences:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 500 170' role='img' aria-label='repr and str dispatch: str falls back to repr'>" +
      "<defs><marker id='py-rs-ar' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='20' y='20' width='150' height='38' rx='8'/><text class='d-text' x='95' y='39' text-anchor='middle'>str(x), print(x)</text><text class='d-sub' x='95' y='52' text-anchor='middle'>f-string {x}</text>" +
      "<rect class='d-box' x='20' y='112' width='150' height='38' rx='8'/><text class='d-text' x='95' y='131' text-anchor='middle'>repr(x), {x!r}</text><text class='d-sub' x='95' y='144' text-anchor='middle'>REPL echo, debugger</text>" +
      "<rect class='d-box-accent' x='240' y='20' width='150' height='38' rx='8'/><text class='d-text' x='315' y='39' text-anchor='middle'>__str__</text><text class='d-sub' x='315' y='52' text-anchor='middle'>readable, user-facing</text>" +
      "<rect class='d-box-accent' x='240' y='112' width='150' height='38' rx='8'/><text class='d-text' x='315' y='131' text-anchor='middle'>__repr__</text><text class='d-sub' x='315' y='144' text-anchor='middle'>unambiguous, dev-facing</text>" +
      "<line class='d-edge' x1='170' y1='39' x2='238' y2='39' marker-end='url(#py-rs-ar)'/>" +
      "<line class='d-edge' x1='170' y1='131' x2='238' y2='131' marker-end='url(#py-rs-ar)'/>" +
      "<path class='d-edge-dashed' d='M315 58 C 315 85, 315 85, 315 110' fill='none' marker-end='url(#py-rs-ar)'/>" +
      "<text class='d-accent d-sub' x='400' y='86'>no __str__? fall back to __repr__</text>" +
      "</svg>\n\n" +
      "- **`__repr__`** — an **unambiguous, developer-facing** representation, ideally one you could paste back to recreate the object (e.g. `Point(x=1, y=2)`). Used by the REPL, the debugger, and containers (a list prints its items' `repr`).\n" +
      "- **`__str__`** — a **readable, user-facing** string (e.g. `(1, 2)`). Used by `str()`, `print()`, and f-string `{x}`.\n\n" +
      "If you define only one, define **`__repr__`** — `str()` falls back to it, but not vice versa. Always give classes a useful `__repr__`; add `__str__` only when the user-facing form should differ.\n\n" +
      "**Interview tip:** 'repr = unambiguous/dev (recreatable), str = readable/user; str falls back to repr.' The actionable rule — *always implement `__repr__`* and that containers use it — is what interviewers want to hear.",
    examples: [
      {
        label: "repr is recreatable; str is friendly; container uses repr",
        tech: "python",
        code:
          "class Point:\n" +
          "    def __init__(self, x, y): self.x, self.y = x, y\n" +
          "    def __repr__(self): return f\"Point(x={self.x}, y={self.y})\"\n" +
          "    def __str__(self): return f\"({self.x}, {self.y})\"\n\n" +
          "p = Point(1, 2)\n" +
          "print(\"print/str :\", p)            # __str__\n" +
          "print(\"repr      :\", repr(p))      # __repr__\n" +
          "print(\"f {p!r}   :\", f\"{p!r}\")\n\n" +
          "# A list always shows each item's repr, not str\n" +
          "print(\"in a list :\", [p, Point(3, 4)])",
      },
    ],
  },
];

export default augments;
