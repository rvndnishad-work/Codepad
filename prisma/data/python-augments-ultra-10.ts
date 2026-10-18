/**
 * PYTHON ULTRA — batch 10: modules, packaging and environments. Every example
 * was run on python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (the runnable: false example on
 * python3.12); quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `What is the difference between a module and a package?`,
    difficulty: "easy",
    seoDescription: `A Python module is one file, a package is a folder of modules with __path__. Regular vs namespace packages, __init__.py, __all__ and imports.`,
    description: `**Question presented to candidate:**
"In Python, what is the difference between a module and a package? How does Python know a folder is a package, what does \`__init__.py\` do, and is it still required?"

**What a strong answer should cover:**
- A module is the unit of import: usually one \`.py\` file, loaded into a \`module\` object whose attributes are the file's top-level names
- A package is a module that can contain other modules: it has a \`__path__\` attribute (the folders searched for its submodules), and its own code lives in \`__init__.py\`
- At run time both are the same type (\`types.ModuleType\`); "package" just means "has \`__path__\`", and dotted names like \`shop.payments.card\` walk down packages
- \`__init__.py\` runs once on first import and is where a package exposes its public API (re-exports, \`__all__\`); importing a package does not import all its submodules
- Namespace packages (PEP 420, Python 3.3+) have no \`__init__.py\`, can be split over several folders, and have \`__file__ = None\`; a regular package with \`__init__.py\` wins over namespace portions
- Modules and packages are code-organisation units; a distribution (what \`pip install\` downloads) is a different thing that can ship many of them

**Code / implementation expected:** Optional — sketch a small folder layout and show \`import pkg.sub\` and \`from pkg import name\`.`,
    answer: `**Target Audience:** Beginners learning Python, and anyone preparing for a Python interview
**Difficulty:** Easy
**Python version:** Every example was run on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think of a kitchen. A single recipe card ("Tomato soup") is useful on its own: you pick it up and follow it. That is a **module**. A recipe **binder** with tabs ("Soups", "Desserts", and inside "Desserts" another tab for "Cakes") is how you keep fifty cards findable. That is a **package**. The binder also has a cover page that says "start here: the three recipes most people want". That cover page is \`__init__.py\`.

As soon as a program grows past one file, you need both ideas: files to split the code, and folders to group the files so that \`payments.card\` and \`shipping.card\` can both exist without clashing. Interviewers ask this question to check that you know how Python turns files and folders into importable names, and what actually happens when you write \`import shop.payments.card\`.

## 2. What a Module Is

A **module** is one unit of code that you can import. Most of the time it is a single file, \`greet.py\`, and you import it by its file name without the extension: \`import greet\`.

When Python imports a file the first time, it **runs the whole file from top to bottom** and collects every top-level name it defined (functions, classes, variables) into a new object. That object is the module. \`greet.hi\` is just "the name \`hi\` inside the module object \`greet\`".

📌 **Interview term: Module** — the object Python creates when it imports a file (or a built-in or compiled extension). Its attributes are the file's top-level names, kept in the module's \`__dict__\`, which is also the file's global namespace.

📌 **Interview term: Namespace** — a mapping from names to objects. Each module has its own, which is why \`greet.WORD\` and \`shop.WORD\` never collide.

Example 1 imports a file called \`greet.py\` and prints \`(running greet.py)\` exactly once, even though the program imports it twice. The second import finds the module in a cache (\`sys.modules\`) and does not run the file again. That cache is the heart of the [Python import system](/interview-question/how-does-the-python-import-system-work).

## 3. What a Package Is

A **package** is a module that can contain other modules. On disk, a regular package is a **folder with an \`__init__.py\` file** in it. The folder name is the package name, and the \`.py\` files and sub-folders inside it become its submodules and subpackages.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 300" role="img" aria-label="A module is one file named greet.py. A package is a folder named shop holding an init file, a cart module and a payments subpackage with a card module.">
  <rect class="d-box" x="30" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="130" y="60" text-anchor="middle">greet.py</text>
  <text class="d-sub" x="130" y="82" text-anchor="middle">module: one file</text>
  <rect class="d-box-accent" x="300" y="30" width="350" height="250" rx="12"/>
  <text class="d-text" x="475" y="58" text-anchor="middle">shop/   package: a folder</text>
  <rect class="d-box" x="330" y="80" width="140" height="50" rx="8"/>
  <text class="d-text" x="400" y="110" text-anchor="middle">__init__.py</text>
  <rect class="d-box" x="490" y="80" width="140" height="50" rx="8"/>
  <text class="d-text" x="560" y="110" text-anchor="middle">cart.py</text>
  <rect class="d-box-muted" x="330" y="160" width="300" height="100" rx="10"/>
  <text class="d-text" x="480" y="186" text-anchor="middle">payments/   subpackage</text>
  <rect class="d-box" x="350" y="200" width="120" height="44" rx="8"/>
  <text class="d-text" x="410" y="227" text-anchor="middle">__init__.py</text>
  <rect class="d-box" x="490" y="200" width="120" height="44" rx="8"/>
  <text class="d-text" x="550" y="227" text-anchor="middle">card.py</text>
</svg>

So \`import shop.payments.card\` means: import the package \`shop\`, then its subpackage \`shop.payments\`, then the module \`shop.payments.card\`. The dots follow the folders.

📌 **Interview term: Package** — a module that has a \`__path__\` attribute: the list of folders where Python looks for its submodules. A regular package is a folder with \`__init__.py\`; its code is that file.

📌 **Interview term: Subpackage / submodule** — a package or module that lives inside another package and is named with a dot, like \`shop.payments\` or \`shop.cart\`.

### The key insight: at run time, a package is just a module with \`__path__\`

<div style="background:#0d2233;border-left:4px solid #4fc3f7;border-radius:8px;padding:14px 18px;margin:16px 0;color:#e1f5fe;">
<strong style="color:#81d4fa;">Key insight:</strong> <span style="color:#e1f5fe;">Python has no separate "package" type. Example 1 prints <code style="background:#12344d;color:#b3e5fc;padding:1px 5px;border-radius:3px;">module module</code> for <code style="background:#12344d;color:#b3e5fc;padding:1px 5px;border-radius:3px;">type(greet)</code> and <code style="background:#12344d;color:#b3e5fc;padding:1px 5px;border-radius:3px;">type(shop)</code>. The only difference the interpreter cares about is that the package has a <code style="background:#12344d;color:#b3e5fc;padding:1px 5px;border-radius:3px;">__path__</code>, so it can be the parent of other modules.</span>
</div>

Example 1 shows the details from a real run:

| Check | \`greet\` (module) | \`shop\` (package) |
| :--- | :--- | :--- |
| \`type(x).__name__\` | \`module\` | \`module\` |
| \`hasattr(x, "__path__")\` | \`False\` | \`True\` |
| \`__file__\` (relative) | \`greet.py\` | \`shop/__init__.py\` |
| \`__spec__.submodule_search_locations\` | \`None\` | the \`shop\` folder |

## 4. What \`__init__.py\` Does

\`__init__.py\` is the package's own module body. It runs **once, the first time anything in the package is imported**, before any submodule. Typical jobs:

1. **Mark the folder as a regular package** (see namespace packages below for the case without it).
2. **Define the public API.** In Example 1, \`shop/__init__.py\` does \`from .cart import Cart\`, so users can write \`shop.Cart\` instead of \`shop.cart.Cart\`. This is called **re-exporting**.
3. **Set \`__all__\`**, the list of names that \`from shop import *\` hands out.
4. Package-wide set-up, kept small, because it runs on every first import.

It may also be empty, which is very common.

📌 **Interview term: \`__init__.py\`** — the file that turns a folder into a regular package; it is executed as the package module when the package is first imported.

📌 **Interview term: \`__all__\`** — a list of public names in a module or package. It controls \`from module import *\` and documents the public API. Example 2 shows \`from mathx import *\` giving only \`['add']\`, not \`helper\` or \`_secret\`.

**Importing a package does not import every submodule.** Example 1 prints \`False\` for \`"shop.payments" in sys.modules\` after \`import shop\`. Only after \`import shop.payments.card\` do all three appear in \`sys.modules\`: \`['shop', 'shop.cart', 'shop.payments', 'shop.payments.card']\` (\`shop.cart\` is there because \`__init__.py\` imported it). If you want \`shop.payments\` available after \`import shop\`, \`shop/__init__.py\` has to import it.

## 5. Namespace Packages: Folders Without \`__init__.py\`

Since Python 3.3, a folder **without** \`__init__.py\` can still be imported as a package. PEP 420 calls these **namespace packages**; the What's New in Python 3.3 page lists "native support for package directories that don't require \`__init__.py\` marker files and can automatically span multiple path segments" ([What's New In Python 3.3](https://docs.python.org/3/whatsnew/3.3.html)).

The special power is that one namespace package can be **assembled from several folders**. Two separately installed libraries can each ship a \`plugins/\` folder, and Python merges them into one \`plugins\` package:

<svg class="iq-diagram" width="100%" viewBox="0 0 680 270" role="img" aria-label="Two folders on sys.path, dist_a and dist_b, each contain a plugins folder without an init file. Python merges both into one namespace package named plugins.">
  <defs>
    <marker id="mp1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="155" y="62" text-anchor="middle">dist_a/plugins/</text>
  <text class="d-sub" x="155" y="88" text-anchor="middle">csv_export.py</text>
  <rect class="d-box" x="400" y="30" width="250" height="80" rx="10"/>
  <text class="d-text" x="525" y="62" text-anchor="middle">dist_b/plugins/</text>
  <text class="d-sub" x="525" y="88" text-anchor="middle">pdf_export.py</text>
  <rect class="d-box-accent" x="190" y="180" width="300" height="70" rx="10"/>
  <text class="d-text" x="340" y="208" text-anchor="middle">import plugins</text>
  <text class="d-sub" x="340" y="232" text-anchor="middle">one package, two folders in __path__</text>
  <path class="d-edge" d="M 155 110 L 280 176" marker-end="url(#mp1-arrow)"/>
  <path class="d-edge" d="M 525 110 L 400 176" marker-end="url(#mp1-arrow)"/>
</svg>

Example 2 builds exactly this layout and shows that \`plugins.__file__\` is \`None\`, \`plugins.__path__\` is a \`_NamespacePath\` holding both folders, and both \`plugins.csv_export\` and \`plugins.pdf_export\` import.

📌 **Interview term: Namespace package** — a package with no \`__init__.py\`, whose \`__path__\` can span several folders on \`sys.path\`. It has no code of its own and no \`__file__\`.

📌 **Interview term: Regular package** — the classic kind: one folder with \`__init__.py\`. Its \`__path__\` is a plain list with one folder.

**Which one wins?** While scanning \`sys.path\`, Python remembers namespace candidates but keeps looking. If it finds a regular package (or a module) with that name in **any** later folder, that one wins. Example 2 puts two namespace folders \`first/tools\` and \`second/tools\` before \`third/tools/__init__.py\`, and the import returns the regular package: \`regular third/tools/__init__.py\`. Only if nothing regular exists anywhere does Python build the namespace package.

### Regular vs namespace package

| | Regular package | Namespace package |
| :--- | :--- | :--- |
| Marker | folder with \`__init__.py\` | folder without it |
| \`__file__\` | path to \`__init__.py\` | \`None\` |
| \`__path__\` | a list with one folder | \`_NamespacePath\`, one or more folders |
| Own code / API | yes, in \`__init__.py\` | none |
| Split across installs | no | yes, that is its purpose |
| Typical use | almost every project | plugin systems, large company-wide namespaces |

Use regular packages by default. A missing \`__init__.py\` by accident still "works", which hides mistakes such as test tools or type checkers not finding your package the way you expect.

## 6. Module, Package, Distribution: Three Different Words

| Word | What it is | Example |
| :--- | :--- | :--- |
| **Module** | an importable unit, usually one file | \`json.decoder\` |
| **Package** | a module with \`__path__\`, usually a folder | \`json\`, \`email.mime\` |
| **Distribution** | the thing you install from PyPI (a wheel or sdist) | \`pip install requests\` |

A distribution can contain many top-level packages, and its name need not match the import name: the distribution **Pillow** is imported as \`PIL\`.

📌 **Interview term: Distribution (distribution package)** — the installable archive, such as a wheel, that puts modules and packages into \`site-packages\`. "Package" in "package manager" means this, not the import-system package.

## 7. Absolute and Relative Imports Inside a Package

Inside a package, a module can refer to its siblings two ways:

~~~python
# shop/__init__.py
from shop.cart import Cart     # absolute: full dotted name
from .cart import Cart         # relative: "." means "my own package"
from ..utils import money      # ".." means "the parent package" (only inside a subpackage)
~~~

Relative imports use the module's \`__package__\` (Example 1 prints \`shop.payments\` for \`shop.payments.card\`). They only work in a module that was imported as part of a package. Running \`python shop/cart.py\` directly makes the file \`__main__\` with no package, and a relative import there fails; run it as \`python -m shop.cart\` instead. The \`__main__\` name has its own page: [what \`if __name__ == "__main__"\` does](/interview-question/what-does-if-name-main-do).

## 8. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3.11 main.py\`, and again in this page (Pyodide 0.25.1); the output was identical. Each one writes its files into a fresh temporary folder, so it runs anywhere.

**Example 1 — a module and a package, imported** prints:

~~~text
import greet
  (running greet.py)
import shop
  (running shop/__init__.py)
module module
False
True
greet.py
shop/__init__.py
hello, Ada
Cart
False
charged 5
shop.payments.card | package: shop.payments
['shop', 'shop.cart', 'shop.payments', 'shop.payments.card']
import greet again
done
~~~

**Example 2 — namespace packages, which package wins, and \`__all__\`** prints:

~~~text
None
_NamespacePath
['dist_a/plugins', 'dist_b/plugins']
csv pdf
None
regular third/tools/__init__.py
['add']
~~~

**What the output shows:** both objects are of type \`module\`; only the package has \`__path__\`; \`__init__.py\` ran once on \`import shop\` and re-exported \`Cart\`; \`shop.payments\` was not imported until asked for; the second \`import greet\` printed nothing because the module was cached. In Example 2 the namespace package has no file and two folders, a regular package anywhere on the path beat the namespace candidates, and \`import *\` respected \`__all__\`.

## 9. Edge Cases

- **A module can be more than a \`.py\` file.** Built-in modules (\`sys\`), compiled extensions (\`.so\` / \`.pyd\`), \`.pyc\`-only files and modules inside zip files are all modules too.
- **A module name must be a valid identifier** to be imported with the \`import\` statement. \`my-utils.py\` can only be loaded with \`importlib.import_module("my-utils")\`.
- **Shadowing.** A file named \`json.py\` or \`random.py\` in your project folder is found before the standard library one, because the script folder comes first on \`sys.path\`.
- **\`__init__.py\` side effects run on every first import** of anything inside the package, including in tests and CLIs. Heavy work there makes \`import shop.tiny_helper\` slow.
- **Circular imports between submodules** usually show up first in \`__init__.py\` re-exports; see [the import system](/interview-question/how-does-the-python-import-system-work) for why they fail.

## Common Pitfalls

- **Expecting \`import shop\` to load \`shop.payments\`.** It does not, unless \`shop/__init__.py\` imports it. Write \`import shop.payments\` or re-export it.
- **Forgetting \`__init__.py\` by accident.** The folder becomes a namespace package, \`__file__\` is \`None\`, and tools that look for package files may skip it.
- **Running a package module as a script** (\`python shop/cart.py\`) and getting "attempted relative import with no known parent package". Use \`python -m shop.cart\`.
- **Naming a file after a standard library module** (\`email.py\`, \`random.py\`): your file shadows the real one.
- **Treating "package" as "the thing on PyPI".** The import package \`PIL\` comes from the distribution \`Pillow\`; they are different concepts.
- **Putting \`from .x import *\` everywhere in \`__init__.py\`.** It hides where names come from; re-export explicitly and list them in \`__all__\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A module is the unit of import, usually one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.py</code> file; importing it runs the file once and gives you a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module</code> object holding its top-level names.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Package:</strong> <span style="color:#f0e2c8;">A package is a module that can contain modules: it has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;path&#95;&#95;</code>, the folders searched for submodules. A regular package is a folder with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;.py</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Same type:</strong> <span style="color:#f0e2c8;">At run time both are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">types.ModuleType</code>; dotted names like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shop.payments.card</code> walk down packages, and importing a package does not import its submodules.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. &#95;&#95;init&#95;&#95;.py:</strong> <span style="color:#f0e2c8;">It runs once on first import and defines the public API: re-exports such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from .cart import Cart</code> and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;all&#95;&#95;</code> list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Namespace packages:</strong> <span style="color:#f0e2c8;">Since 3.3 (PEP 420) a folder without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;.py</code> is a namespace package that can span several folders, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;file&#95;&#95;</code> set to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>; a regular package wins over it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;.py</code> still required in Python 3?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Without it the folder becomes a namespace package. You still want it in normal projects: it gives the package a file, a place for its API, and predictable behaviour for tools.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import shop.cart</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">from shop import cart</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both import <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shop</code> and then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shop.cart</code>. The first binds the name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shop</code> in your namespace, the second binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cart</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from shop import cart</code> also works when <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cart</code> is just an attribute set in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;.py</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">python shop/cart.py</code> break the relative imports?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run as a script, the file is named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;main&#95;&#95;</code> and has no parent package, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.</code> means nothing. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python -m shop.cart</code> imports it as part of the package and the relative imports resolve.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you control what <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">from package import &#42;</code> gives?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Define <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;all&#95;&#95;</code> in the package <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;init&#95;&#95;.py</code>. Without it, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import &#42;</code> gives every top-level name that does not start with an underscore, including modules the package itself imported, like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">os</code>; with it, exactly the listed names.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you use a namespace package on purpose?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When several separately installed distributions must share one top-level name, like a plugin namespace or a company-wide <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">acme.&#42;</code> prefix. Each distribution ships its part and Python merges them.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Module** | the object made by importing a file; its attributes are the file's top-level names |
| **Namespace** | a mapping of names to objects; every module has its own |
| **Package** | a module with \`__path__\` that can contain submodules |
| **Subpackage / submodule** | a package or module inside another one, named with a dot |
| **\`__init__.py\`** | the file that makes a folder a regular package and runs on first import |
| **\`__all__\`** | the list of public names that \`from x import *\` gives |
| **Namespace package** | a package without \`__init__.py\`, possibly spread over several folders |
| **Regular package** | a folder with \`__init__.py\`; \`__path__\` is a one-folder list |
| **Distribution** | the installable archive (wheel or sdist) that ships modules and packages |

---
**Conclusion:** A module is a file turned into an object; a package is a module with a \`__path__\`, so it can hold other modules, and on disk that is a folder with \`__init__.py\`. Both are the same type at run time, dotted names walk down the folders, and importing a package runs only its \`__init__.py\`, not every submodule. Use \`__init__.py\` to expose a clean API and \`__all__\` to say what is public, know that a folder without it is a namespace package that can span several folders, and keep the word "package" separate from the distribution you \`pip install\`.
`,
    examples: [
      { label: `Build a module and a package on disk, then import them`, code: `# Build a tiny project on disk: one module and one package, then import both.
import importlib
import os
import sys
import tempfile

root = tempfile.mkdtemp()

def write(rel, text):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)

write("greet.py", 'print("  (running greet.py)")\\ndef hi(name):\\n    return "hello, " + name\\n')
write("shop/__init__.py", 'print("  (running shop/__init__.py)")\\nfrom .cart import Cart\\n__all__ = ["Cart"]\\n')
write("shop/cart.py", "class Cart:\\n    def __init__(self):\\n        self.items = []\\n")
write("shop/payments/__init__.py", "")
write("shop/payments/card.py", 'def charge(amount):\\n    return "charged " + str(amount)\\n')
sys.path.insert(0, root)
importlib.invalidate_caches()

print("import greet")
import greet
print("import shop")
import shop

# Both are the same kind of object at run time.
print(type(greet).__name__, type(shop).__name__)
# What makes shop a package: it has __path__, a list of folders to search.
print(hasattr(greet, "__path__"))  # False
print(hasattr(shop, "__path__"))  # True
print(os.path.relpath(greet.__file__, root))
print(os.path.relpath(shop.__file__, root))
print(greet.hi("Ada"))

# __init__.py imported cart for us, so shop.Cart works.
print(type(shop.Cart()).__name__)
# Importing a package does NOT import every submodule inside it.
print("shop.payments" in sys.modules)
import shop.payments.card
print(shop.payments.card.charge(5))
print(shop.payments.card.__name__, "| package:", shop.payments.card.__package__)
print(sorted(n for n in sys.modules if n == "shop" or n.startswith("shop.")))

# A second import finds the cached module: nothing runs again.
print("import greet again")
import greet
print("done")` },
      { label: `Namespace packages, which package wins, and __all__`, code: `# Namespace packages: one package name spread over two folders, no __init__.py.
import importlib
import os
import sys
import tempfile

base = tempfile.mkdtemp()

def write(rel, text):
    path = os.path.join(base, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)

# Two separately installed distributions both contribute to "plugins".
write("dist_a/plugins/csv_export.py", 'NAME = "csv"\\n')
write("dist_b/plugins/pdf_export.py", 'NAME = "pdf"\\n')
sys.path[:0] = [os.path.join(base, "dist_a"), os.path.join(base, "dist_b")]
importlib.invalidate_caches()

import plugins
import plugins.csv_export
import plugins.pdf_export

print(plugins.__file__)  # None
print(type(plugins.__path__).__name__)
print([os.path.relpath(p, base) for p in plugins.__path__])
print(plugins.csv_export.NAME, plugins.pdf_export.NAME)
print(plugins.__spec__.origin)  # None

# A regular package anywhere on sys.path beats namespace portions,
# even when the namespace folders come first.
write("first/tools/a.py", "")
write("second/tools/b.py", "")
write("third/tools/__init__.py", 'KIND = "regular"\\n')
sys.path[:0] = [os.path.join(base, d) for d in ("first", "second", "third")]
importlib.invalidate_caches()
import tools
print(tools.KIND, os.path.relpath(tools.__file__, base))

# from package import * follows __all__ when the package defines it.
write("lib/mathx/__init__.py", '__all__ = ["add"]\\ndef add(a, b):\\n    return a + b\\ndef _secret():\\n    return 42\\ndef helper():\\n    return 0\\n')
sys.path.insert(0, os.path.join(base, "lib"))
importlib.invalidate_caches()
ns = {}
exec("from mathx import *", ns)
print(sorted(k for k in ns if not k.startswith("__")))` },
    ],
  },
  {
    title: `How does the Python import system work?`,
    difficulty: "hard",
    seoDescription: `How Python import works: sys.modules cache, meta path finders, specs, loaders, execute-once, reload, relative imports and circular imports.`,
    description: `**Question presented to candidate:**
"Walk me through what actually happens when Python runs \`import foo.bar\`. Where does it look, what objects are involved, why does a module's code run only once, and why do circular imports sometimes fail with 'partially initialized module'?"

**What a strong answer should cover:**
- \`import\` is a run-time statement (\`IMPORT_NAME\` in bytecode), not a textual include; the first stop is the \`sys.modules\` cache, which is why a module body executes only once per process
- On a cache miss, each finder on \`sys.meta_path\` is asked \`find_spec(name, path)\`; the defaults are \`BuiltinImporter\`, \`FrozenImporter\` and \`PathFinder\`, which walks \`sys.path\` (or the parent package \`__path__\`) using path-entry finders from \`sys.path_hooks\`, cached in \`sys.path_importer_cache\`
- The finder returns a \`ModuleSpec\` (name, loader, origin, \`submodule_search_locations\`); the loader creates the module, it is put in \`sys.modules\` before the body runs, then \`exec_module\` runs the code; on error the entry is removed
- Dotted imports import each parent first (\`foo\`, then \`foo.bar\` using \`foo.__path__\`); \`import foo.bar\` binds \`foo\`, \`from foo import bar\` binds \`bar\`; relative imports are resolved against \`__package__\`
- Circular imports work only when the half-initialised module already has the names being asked for; fixes are importing the module instead of names, moving the import, or restructuring
- Source files are compiled to \`__pycache__/*.cpython-3XX.pyc\`, revalidated by source mtime and size by default (hash-based pycs since 3.7, PEP 552); \`importlib.reload\` re-executes into the same object

**Clarifying questions expected:**
- Are we talking about CPython's default machinery, or a custom setup (zip apps, frozen apps, a custom finder)?
- Is the interest in how to debug a specific import error (wrong module picked up, circular import)?

**Code / implementation expected:** Optional — a custom \`MetaPathFinder\` / \`Loader\`, or a circular-import repro and its fix.`,
    answer: `**Target Audience:** Python developers who know how to import things and want to know how importing works, and candidates for senior Python interviews
**Difficulty:** Hard
**Python version:** Every example was run on CPython 3.11 (and in this page on Pyodide 0.25.1, which is CPython 3.11.3); Example 2 also gave identical output on 3.13

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine a big office where people keep asking the front desk for documents. The receptionist has a shelf of **documents already fetched today**. If the one you want is on the shelf, you get that very copy at once. If not, the receptionist phones a list of departments in a fixed order ("Built-in archive? Frozen archive? File room?") until one says "I know where that is, and here is who will fetch it". The fetcher brings it, the receptionist **puts it on the shelf before you have even finished reading it**, and from then on everyone who asks gets the same copy.

That is the Python import system: a cache (\`sys.modules\`), a list of departments (finders), a slip saying where the thing is and who fetches it (a spec), and the fetcher (a loader). Knowing these four parts explains things that look like magic or bugs: why a module's \`print\` runs once, why you got the wrong \`json.py\`, why two modules that import each other crash with "partially initialized module", and how tools like pytest, zipapps or plugin systems hook into \`import\`.

## 2. \`import\` Is a Statement That Runs

\`import\` is not like \`#include\` in C. It is ordinary code that runs when that line is reached. CPython compiles it to the \`IMPORT_NAME\` instruction. On our python3.11 run, \`dis\` of \`import os.path\` and \`from json import loads as L\` prints:

~~~text
  0           0 RESUME                   0

  1           2 LOAD_CONST               0 (0)
              4 LOAD_CONST               1 (None)
              6 IMPORT_NAME              0 (os.path)
              8 STORE_NAME               1 (os)

  2          10 LOAD_CONST               0 (0)
             12 LOAD_CONST               2 (('loads',))
             14 IMPORT_NAME              2 (json)
             16 IMPORT_FROM              3 (loads)
             18 STORE_NAME               4 (L)
             20 POP_TOP
             22 LOAD_CONST               1 (None)
             24 RETURN_VALUE
~~~

Two details are already visible. \`import os.path\` stores the name **\`os\`**, not \`os.path\`: the statement imports \`os\` and then \`os.path\`, and binds the top-level package. And \`from json import loads\` imports \`json\` and then reads the attribute \`loads\` from it with \`IMPORT_FROM\`. The first \`LOAD_CONST 0\` is the relative-import **level** (0 = absolute).

📌 **Interview term: \`IMPORT_NAME\`** — the bytecode instruction for an import statement. It calls the import machinery (the same one behind \`builtins.__import__\` and \`importlib.import_module\`) and pushes the resulting module.

## 3. The Big Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 700 420" role="img" aria-label="Import flow. import foo checks sys.modules. A hit returns the cached module. A miss asks each finder on sys.meta_path for a spec. The spec names a loader, which creates the module, stores it in sys.modules, then executes the module body.">
  <defs>
    <marker id="is1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="30" width="180" height="60" rx="10"/>
  <text class="d-text" x="130" y="56" text-anchor="middle">import foo</text>
  <text class="d-sub" x="130" y="77" text-anchor="middle">IMPORT_NAME</text>
  <rect class="d-box-accent" x="280" y="30" width="180" height="60" rx="10"/>
  <text class="d-text" x="370" y="56" text-anchor="middle">sys.modules</text>
  <text class="d-sub" x="370" y="77" text-anchor="middle">is foo cached?</text>
  <rect class="d-box-muted" x="520" y="30" width="150" height="60" rx="10"/>
  <text class="d-text" x="595" y="56" text-anchor="middle">hit</text>
  <text class="d-sub" x="595" y="77" text-anchor="middle">return it</text>
  <rect class="d-box" x="280" y="160" width="180" height="60" rx="10"/>
  <text class="d-text" x="370" y="186" text-anchor="middle">sys.meta_path</text>
  <text class="d-sub" x="370" y="207" text-anchor="middle">find_spec on each</text>
  <rect class="d-box" x="40" y="160" width="180" height="60" rx="10"/>
  <text class="d-text" x="130" y="186" text-anchor="middle">all said None</text>
  <text class="d-sub" x="130" y="207" text-anchor="middle">ModuleNotFoundError</text>
  <rect class="d-box" x="280" y="290" width="180" height="60" rx="10"/>
  <text class="d-text" x="370" y="316" text-anchor="middle">ModuleSpec</text>
  <text class="d-sub" x="370" y="337" text-anchor="middle">name, loader, origin</text>
  <rect class="d-box-accent" x="510" y="290" width="170" height="100" rx="10"/>
  <text class="d-text" x="595" y="318" text-anchor="middle">loader</text>
  <text class="d-sub" x="595" y="342" text-anchor="middle">1 create module</text>
  <text class="d-sub" x="595" y="362" text-anchor="middle">2 add to sys.modules</text>
  <text class="d-sub" x="595" y="382" text-anchor="middle">3 exec the body</text>
  <path class="d-edge" d="M 220 60 L 276 60" marker-end="url(#is1-arrow)"/>
  <path class="d-edge" d="M 460 60 L 516 60" marker-end="url(#is1-arrow)"/>
  <path class="d-edge-dashed" d="M 370 90 L 370 156" marker-end="url(#is1-arrow)"/>
  <path class="d-edge-dashed" d="M 280 190 L 224 190" marker-end="url(#is1-arrow)"/>
  <path class="d-edge" d="M 370 220 L 370 286" marker-end="url(#is1-arrow)"/>
  <path class="d-edge" d="M 460 320 L 506 320" marker-end="url(#is1-arrow)"/>
</svg>

The dashed arrows are the miss path. The full sequence for \`import foo\` is:

1. **Look in \`sys.modules\`.** If \`"foo"\` is there, use that object. Done.
2. **Ask the finders.** For each finder in \`sys.meta_path\`, call \`finder.find_spec("foo", path)\`. The first one that returns a spec wins. If they all return \`None\`, raise \`ModuleNotFoundError\`.
3. **Load.** The spec's loader creates the module object, the module is **inserted into \`sys.modules\`**, and then the loader **executes** the module's code inside the module's namespace.
4. **Bind the name** in the importing namespace (\`foo\`, or the names after \`from ... import\`).

Each step is visible from Python, which is what the two examples on this page do.

## 4. Step 1: The \`sys.modules\` Cache

\`sys.modules\` is a plain dictionary from full module names to module objects. Every successful import is recorded there, which gives three behaviours that interviewers love:

- **A module body runs once per process.** Example 1 imports \`settings\` twice and the "executing" line prints once; \`settings is again is sys.modules["settings"]\` is \`True\`.
- **Everyone shares one object.** Setting \`settings.DEBUG = True\` in one module is visible in all modules that imported \`settings\`. (This is also why monkey patching works.)
- **The cache is writable.** \`del sys.modules["settings"]\` makes the next import build a brand-new object (Example 1: \`fresh object: False\`); test frameworks and \`unittest.mock.patch.dict(sys.modules, ...)\` use this.

📌 **Interview term: \`sys.modules\`** — the process-wide dictionary cache of imported modules. Import checks it first, and it is the reason module code executes only once.

\`importlib.reload(module)\` is different from deleting the entry: it finds the source again and **re-runs the body inside the same module object**. Example 1 sets \`settings.LOADS = 99\`, reloads, and gets \`after reload: 1 True\` — the value was reset by re-running the file, and it is still the same object. Objects that other modules copied out earlier (\`from settings import LOADS\`, instances of old classes) are not updated, which is why \`reload\` is a development tool, not a deployment tool.

## 5. Step 2: Finders, \`sys.meta_path\` and \`sys.path\`

On a cache miss Python asks each object in \`sys.meta_path\`. On a clean python3.11 (run with \`-I -S\`, so no site-packages hooks) the list is:

~~~text
['BuiltinImporter', 'FrozenImporter', 'PathFinder']
~~~

- **\`BuiltinImporter\`** finds modules compiled into the interpreter, such as \`sys\` (spec origin \`built-in\`).
- **\`FrozenImporter\`** finds modules whose bytecode is frozen into the binary, such as \`zipimport\` (origin \`frozen\`).
- **\`PathFinder\`** handles everything that lives on disk or in zip files. It walks the folders in **\`sys.path\`** for a top-level module, or the parent package's **\`__path__\`** for a submodule.

Installed tools can add finders: on our machine, a normal \`python3.11\` start (with site-packages) shows a fourth one first, setuptools' \`DistutilsMetaFinder\`, added by a \`.pth\` file. pytest's assertion rewriting and some kinds of editable install hook in the same way.

📌 **Interview term: Finder (meta path finder)** — an object with \`find_spec(fullname, path, target=None)\` that returns a \`ModuleSpec\` if it can handle the module, or \`None\` to pass. They live in \`sys.meta_path\` and are asked in order.

📌 **Interview term: \`sys.path\`** — the list of folders (and zip files) that \`PathFinder\` searches for top-level modules. It starts with the script folder (or the current folder for \`-c\` and \`-m\`), then \`PYTHONPATH\`, the standard library, and \`site-packages\`.

**Path-entry finders.** \`PathFinder\` does not know how to read a folder or a zip file by itself. For each entry in \`sys.path\` it asks the callables in \`sys.path_hooks\` (on 3.11: \`zipimporter\` and \`FileFinder.path_hook...path_hook_for_FileFinder\`) to build a path-entry finder, and caches the result in \`sys.path_importer_cache\`. For a normal folder that is a \`FileFinder\`, which lists the folder once, caches the listing, and looks for \`foo/__init__.py\`, \`foo.cpython-311-x86_64-linux-gnu.so\` and other extension suffixes, \`foo.py\`, \`foo.pyc\`, or a bare \`foo/\` folder (namespace package candidate).

That cached directory listing is why the examples on this page call **\`importlib.invalidate_caches()\`** after writing new files: without it, a \`FileFinder\` created earlier may not see a file that appeared after it listed the folder.

📌 **Interview term: Path-entry finder** — a finder bound to one \`sys.path\` entry (a \`FileFinder\` for a folder, a \`zipimporter\` for a zip). Created by \`sys.path_hooks\`, cached in \`sys.path_importer_cache\`.

### Submodules use the parent \`__path__\`

For \`import virtual.greet\`, Python first imports \`virtual\`, then asks the finders for \`virtual.greet\` with \`path=virtual.__path__\`. Example 2 logs exactly that:

~~~text
find_spec: virtual path=None
find_spec: virtual.greet path=parent.__path__
find_spec: virtual.config path=parent.__path__
~~~

\`path=None\` means "top level, use \`sys.path\`". \`virtual.config\` was found next because \`greet\` itself ran \`from . import config\`. If you need the difference between a module and a package and what \`__path__\` is, see [module vs package](/interview-question/what-is-the-difference-between-a-module-and-a-package).

## 6. Step 3: The Spec and the Loader

The winning finder returns a **\`ModuleSpec\`**: a small record saying what the module is called, where it comes from, and who will load it. Example 1 prints the parts for a file on disk: name \`settings\`, loader \`SourceFileLoader\`, origin \`settings.py\`, and cached bytecode at \`__pycache__/settings.cpython-311.pyc\`.

📌 **Interview term: \`ModuleSpec\`** — the import-time description of a module: \`name\`, \`loader\`, \`origin\` (file path, \`built-in\` or \`frozen\`), \`submodule_search_locations\` (only for packages; becomes \`__path__\`) and \`cached\` (the \`.pyc\` path). Every module keeps it as \`__spec__\`.

📌 **Interview term: Loader** — the object that turns a spec into a running module: \`create_module(spec)\` (return \`None\` for a normal module object) and \`exec_module(module)\` (run the code in \`module.__dict__\`).

Then the import machinery does, in this order:

1. \`module = loader.create_module(spec)\` or a default new module object
2. set \`__name__\`, \`__spec__\`, \`__loader__\`, \`__file__\`, \`__package__\`, \`__path__\` from the spec
3. **\`sys.modules[name] = module\`**
4. \`loader.exec_module(module)\`; if it raises, **remove \`sys.modules[name]\`** and let the error propagate

Step 3 coming before step 4 is the most important detail of the whole system. Example 1's module prints \`already in sys.modules? True\` from inside its own body. This ordering is what lets a module that imports itself indirectly (a cycle) get the half-built object instead of looping forever.

**Bytecode caching.** \`SourceFileLoader\` compiles \`settings.py\` to a code object and writes it to \`__pycache__/settings.cpython-311.pyc\` (the \`cpython-311\` part is the cache tag; python3.12 wrote \`cpython-312\` in our run). The \`.pyc\` header holds a magic number plus the source file's modification time and size; on our run the flags word was \`0\` (timestamp-based) and the stored mtime and size matched \`os.stat\` of the source. On the next import the loader compares them and recompiles if they differ. Hash-based \`.pyc\` files, validated by a hash of the source instead, exist since Python 3.7 ([PEP 552](https://peps.python.org/pep-0552/)); timestamp checking stays the default.

## 7. Step 4: Binding Names, and Relative Imports

| Statement | Imports | Binds |
| :--- | :--- | :--- |
| \`import a.b.c\` | \`a\`, \`a.b\`, \`a.b.c\` | \`a\` |
| \`import a.b.c as m\` | the same | \`m\` = \`a.b.c\` |
| \`from a.b import c\` | \`a\`, \`a.b\`, then \`a.b.c\` if \`c\` is not already an attribute | \`c\` |
| \`from . import c\` | resolves \`.\` against \`__package__\` first | \`c\` |

Example 2 checks the first row: after \`import virtual.greet\`, the name \`virtual\` exists and \`greet\` does not.

**Relative imports** are turned into absolute names before any search, using the importing module's \`__package__\`. \`importlib.util.resolve_name\` does that arithmetic: \`"..utils"\` from package \`virtual.sub\` is \`virtual.utils\`, and \`".config"\` from \`virtual\` is \`virtual.config\` (Example 2).

📌 **Interview term: \`__package__\`** — the package a module belongs to; the anchor for relative imports. It is the module's own name for a package, the parent's name for a submodule, and empty for a top-level script, which is why relative imports fail in a script run directly.

## 8. Circular Imports, Explained by the Steps

Because a module is in \`sys.modules\` **before** its body finishes, a cycle does not loop. Instead the second module receives a **partially initialised** module: whatever names the first one had defined up to its \`import\` line.

<svg class="iq-diagram" width="100%" viewBox="0 0 680 290" role="img" aria-label="Circular import timeline. a.py starts and is cached half built. Its first line imports b. b.py runs from a import VALUE, finds a in the cache, but VALUE is not defined yet, so ImportError.">
  <defs>
    <marker id="is2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="270" height="70" rx="10"/>
  <text class="d-text" x="165" y="60" text-anchor="middle">a.py starts</text>
  <text class="d-sub" x="165" y="84" text-anchor="middle">a in sys.modules, empty so far</text>
  <rect class="d-box" x="380" y="30" width="270" height="70" rx="10"/>
  <text class="d-text" x="515" y="60" text-anchor="middle">line 1: import b</text>
  <text class="d-sub" x="515" y="84" text-anchor="middle">b.py starts running</text>
  <rect class="d-box-accent" x="380" y="180" width="270" height="80" rx="10"/>
  <text class="d-text" x="515" y="210" text-anchor="middle">from a import VALUE</text>
  <text class="d-sub" x="515" y="236" text-anchor="middle">a is cached, VALUE missing</text>
  <rect class="d-box-muted" x="30" y="180" width="270" height="80" rx="10"/>
  <text class="d-text" x="165" y="210" text-anchor="middle">ImportError</text>
  <text class="d-sub" x="165" y="236" text-anchor="middle">partially initialized module</text>
  <path class="d-edge" d="M 300 65 L 376 65" marker-end="url(#is2-arrow)"/>
  <path class="d-edge" d="M 515 100 L 515 176" marker-end="url(#is2-arrow)"/>
  <path class="d-edge-dashed" d="M 380 220 L 304 220" marker-end="url(#is2-arrow)"/>
</svg>

The line \`VALUE = "from a"\` in \`a.py\` sits after \`import b\`, so it never ran. Example 1 reproduces this and prints CPython's own message:

~~~text
ImportError: cannot import name 'VALUE' from partially initialized module 'a' (most likely due to a circular import) (a.py)
~~~

After the failure, \`a\` and \`b\` are both gone from \`sys.modules\` (\`False False\`): the machinery removed the modules whose bodies raised.

**Fixes, in order of preference:**

1. **Restructure.** Move the shared code into a third module both can import. A cycle is usually a sign that two modules should be one, or that a shared piece wants its own home.
2. **Import the module, not the name.** \`import d\` and use \`d.read()\` inside a function. The attribute is looked up when the function is **called**, by which time both modules are complete. Example 1 does this with \`c.py\` and \`d.py\` and prints \`from c\`.
3. **Move the import** to the bottom of the file or inside the function that needs it.
4. For type hints only: \`from typing import TYPE_CHECKING\` and import under \`if TYPE_CHECKING:\`.

📌 **Interview term: Partially initialised module** — a module that is already in \`sys.modules\` but whose body has not finished running; another module importing it during that window sees only the names defined so far.

## 9. Hooking In: Your Own Finder and Loader

Because finders and loaders are just objects with two or three methods, you can teach \`import\` new tricks. Example 2 adds a \`DictFinder\` at the front of \`sys.meta_path\` that serves modules from a Python dictionary instead of files:

~~~python
class DictFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        if fullname not in SOURCES:
            return None                      # not mine: ask the next finder
        return importlib.util.spec_from_loader(fullname, DictLoader(),
                                               is_package=(fullname == "virtual"))

class DictLoader(importlib.abc.Loader):
    def create_module(self, spec):
        return None                          # default module object
    def exec_module(self, module):
        exec(SOURCES[module.__name__], module.__dict__)
~~~

With \`is_package=True\` the spec gets \`submodule_search_locations\`, so \`virtual.__path__\` exists (\`[]\`) and submodules can be imported. Real tools use the same finder-plus-loader shape: pytest rewrites \`assert\` statements in test modules with a meta path finder, and zip imports use a path-entry finder (\`zipimporter\`) from \`sys.path_hooks\`.

A second import of an already-imported submodule calls no finder at all (Example 2 prints \`[]\` for the log), and asking for a name nobody provides raises \`ModuleNotFoundError\` with \`e.name\` set to the full missing name, \`virtual.missing\`.

## 10. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3.11 main.py\`, and again in this page (Pyodide 0.25.1); the output was identical. Example 2 also printed the same on python3.13. Example 1 prints \`cpython-312\` instead of \`cpython-311\` in the \`.pyc\` name when run on 3.12, as expected.

**Example 1 — the cache, the spec, execute-once, reload and a circular import** prints:

~~~text
False
  executing settings.py; already in sys.modules? True
same object: True
settings SourceFileLoader settings.py
__pycache__/settings.cpython-311.pyc
  executing settings.py; already in sys.modules? True
after reload: 1 True
  executing settings.py; already in sys.modules? True
fresh object: False
ImportError: cannot import name 'VALUE' from partially initialized module 'a' (most likely due to a circular import) (a.py)
False False
from c
~~~

**Example 2 — a custom finder and loader on \`sys.meta_path\`** prints:

~~~text
  executing virtual.config
hi, debug=True
find_spec: virtual path=None
find_spec: virtual.greet path=parent.__path__
find_spec: virtual.config path=parent.__path__
True False
True virtual
DictLoader
[]
ModuleNotFoundError: No module named 'virtual.missing' | e.name = virtual.missing
virtual.utils
virtual.config
~~~

**What the output shows:** the module body ran once per real import (first import, the \`reload\`, and the import after \`del sys.modules[...]\`) and saw itself already in \`sys.modules\`; \`reload\` kept the object while deleting the entry replaced it; the circular import failed with CPython's "partially initialized module" message and left nothing cached, while the import-the-module fix worked. In Example 2 the parent package was found before each child, child lookups received the parent \`__path__\`, only \`virtual\` was bound, cached modules skipped the finders, and relative names were resolved by arithmetic on \`__package__\`.

## 11. Debugging Imports in Practice

| Symptom | Likely cause | How to check |
| :--- | :--- | :--- |
| Wrong module imported | a local file shadows it (\`json.py\`, \`random.py\`) | \`print(module.__file__)\` or \`module.__spec__.origin\` |
| \`ModuleNotFoundError\` in one environment only | different \`sys.path\` / interpreter / venv | \`python -c "import sys; print(sys.executable, sys.path)"\` |
| "partially initialized module" | circular import | read the traceback bottom-up for the cycle |
| New file not found in a long-running process | stale \`FileFinder\` cache | \`importlib.invalidate_caches()\` |
| Slow start-up | heavy imports at module level | \`python -X importtime -c "import yourapp"\` |
| Need verbose trace | which file was tried | \`python -v -c "import yourapp"\` |

\`-X importtime\` prints self and cumulative microseconds per module; on our run \`import json\` showed \`json.decoder\` pulling in \`re\`, the costliest part. Exact timings differ per machine.

## Common Pitfalls

- **Expecting a second \`import\` to re-run the module.** It returns the cached object; use \`importlib.reload\` (development only) or restart.
- **\`from module import name\` and then expecting updates.** You copied the binding; later reassignments of \`module.name\` (or a \`reload\`) do not change your name. Import the module and use \`module.name\`.
- **Circular imports with \`from x import y\` at the top.** Import the module object, move the import, or restructure.
- **Shadowing the standard library** with a file of the same name in the script folder, which comes first on \`sys.path\`.
- **Mutating \`sys.path\` all over the code** instead of installing the project (an editable install or a proper package layout). It works on your machine and breaks for everyone else.
- **Forgetting \`importlib.invalidate_caches()\`** when code creates modules at run time and imports them in the same process.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Statement, not include:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import</code> runs at that line; it compiles to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">IMPORT&#95;NAME</code>, and the first thing it does is look up the full name in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.modules</code>, so a module body executes once per process.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Finders:</strong> <span style="color:#f0e2c8;">On a miss, each finder on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.meta&#95;path</code> gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find&#95;spec(name, path)</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">BuiltinImporter</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FrozenImporter</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PathFinder</code>, which searches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.path</code>, or the parent <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;path&#95;&#95;</code> for a submodule, via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FileFinder</code> and zip importers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Spec and loader:</strong> <span style="color:#f0e2c8;">The finder returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ModuleSpec</code> with a loader. The loader creates the module, it goes into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.modules</code> before the body runs, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exec&#95;module</code> runs the code; on error the entry is removed.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Names and packages:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import a.b</code> imports <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.b</code> and binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from a import b</code> binds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code>; relative imports are resolved against <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;package&#95;&#95;</code> before searching.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consequences:</strong> <span style="color:#f0e2c8;">Pre-insertion is why circular imports give a "partially initialized module"; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.pyc</code> files in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;pycache&#95;&#95;</code> are revalidated by mtime and size; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reload</code> re-runs code into the same object.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a circular import sometimes work and sometimes fail?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The second module gets the half-built first module from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.modules</code>. If it only does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import a</code> and uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a.x</code> later, it works; if it does <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from a import x</code> before <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> is defined, it fails with "partially initialized module".</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">import</code> load modules from a database or over the network?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">MetaPathFinder</code> on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.meta&#95;path</code> whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find&#95;spec</code> returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">spec&#95;from&#95;loader(name, MyLoader())</code>, and a loader whose <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exec&#95;module</code> gets the source and runs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exec(code, module.&#95;&#95;dict&#95;&#95;)</code>. That is the same shape as pytest's assertion-rewriting hook.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">importlib.reload</code> and deleting from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">sys.modules</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reload</code> re-executes the module body into the same object, so other modules holding the module see new attributes. Deleting the entry makes the next import create a new object, and older importers keep the old one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why might Python import the wrong module?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PathFinder</code> takes the first match on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.path</code>, and the script folder is first. A local <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">random.py</code> or a stale install earlier on the path wins. Check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">module.&#95;&#95;spec&#95;&#95;.origin</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.path</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When are <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.pyc</code> files used and when are they ignored?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SourceFileLoader</code> reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&#95;&#95;pycache&#95;&#95;/name.cpython-3XX.pyc</code> when its stored source mtime and size match the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.py</code>; otherwise it recompiles and rewrites it. Hash-based pycs (PEP 552, 3.7+) check a source hash instead.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`IMPORT_NAME\`** | the bytecode instruction an import statement compiles to |
| **\`sys.modules\`** | dict cache of every imported module; checked first |
| **Finder (meta path finder)** | object on \`sys.meta_path\` whose \`find_spec\` returns a spec or \`None\` |
| **\`sys.path\`** | folders and zips searched for top-level modules |
| **Path-entry finder** | per-folder finder (\`FileFinder\`, \`zipimporter\`) made by \`sys.path_hooks\` |
| **\`ModuleSpec\`** | record of a module name, loader, origin, search locations and cache file |
| **Loader** | creates the module and executes its code |
| **\`__package__\`** | the package a module belongs to; anchor for relative imports |
| **Partially initialised module** | cached module whose body has not finished yet |

---
**Conclusion:** Python import is a small pipeline you can inspect and extend: check the \`sys.modules\` cache, ask each finder on \`sys.meta_path\` for a \`ModuleSpec\`, let the spec's loader create the module, register it in \`sys.modules\`, and only then execute its body. That one ordering choice explains execute-once, shared module state, \`reload\`, and why circular imports fail exactly when a name is requested before it exists. Add how dotted names walk parent \`__path__\`s, how relative imports resolve against \`__package__\`, and how \`.pyc\` caching works, and you can debug any import error and explain how tools like pytest or zip apps hook into it.
`,
    examples: [
      { label: `The cache, the spec, execute-once, reload and a circular import`, code: `# The import steps you can observe: cache, spec, execute-once, reload, circular imports.
import importlib
import os
import sys
import tempfile

root = tempfile.mkdtemp()

def write(name, text):
    with open(os.path.join(root, name), "w") as f:
        f.write(text)

write("settings.py",
      'import sys\\n'
      'print("  executing settings.py; already in sys.modules?", __name__ in sys.modules)\\n'
      'LOADS = 1\\n')
sys.path.insert(0, root)
importlib.invalidate_caches()

# 1. Before the first import the cache has no entry.
print("settings" in sys.modules)
import settings
import settings as again
print("same object:", settings is again is sys.modules["settings"])

# 2. The spec says who found it and who loaded it.
spec = settings.__spec__
print(spec.name, type(spec.loader).__name__, os.path.basename(spec.origin))
print(os.path.relpath(spec.cached, root))

# 3. reload() runs the body again inside the SAME module object.
settings.LOADS = 99
importlib.reload(settings)
print("after reload:", settings.LOADS, settings is again)

# 4. Removing the cache entry makes the next import build a NEW module.
del sys.modules["settings"]
import settings
print("fresh object:", settings is again)

# 5. Circular import: a.py starts, imports b, b asks a for a name not defined yet.
write("a.py", 'import b\\nVALUE = "from a"\\n')
write("b.py", 'from a import VALUE\\n')
importlib.invalidate_caches()
try:
    import a
except ImportError as e:
    print(type(e).__name__ + ":", str(e).replace(root + os.sep, ""))
# The half-built module a stayed out of the cache, b was never added.
print("a" in sys.modules, "b" in sys.modules)

# 6. The fix: import the module, look the name up later (at call time).
write("c.py", 'import d\\nVALUE = "from c"\\ndef show():\\n    return d.read()\\n')
write("d.py", 'import c\\ndef read():\\n    return c.VALUE\\n')
importlib.invalidate_caches()
import c
print(c.show())` },
      { label: `Write your own finder and loader on sys.meta_path`, code: `# Plug into the import system: a meta path finder that serves modules from a dict.
import importlib.abc
import importlib.util
import sys

SOURCES = {
    "virtual": "",                                  # a package (it gets __path__)
    "virtual.config": 'DEBUG = True\\nprint("  executing virtual.config")\\n',
    "virtual.greet": 'from . import config\\ndef hi():\\n    return "hi, debug=" + str(config.DEBUG)\\n',
}
calls = []

class DictFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path, target=None):
        calls.append((fullname, "path=None" if path is None else "path=parent.__path__"))
        if fullname not in SOURCES:
            return None                             # not mine: ask the next finder
        is_pkg = fullname == "virtual"
        return importlib.util.spec_from_loader(fullname, DictLoader(), is_package=is_pkg)

class DictLoader(importlib.abc.Loader):
    def create_module(self, spec):
        return None                                 # use the default module object
    def exec_module(self, module):
        exec(SOURCES[module.__name__], module.__dict__)

sys.meta_path.insert(0, DictFinder())

import virtual.greet
print(virtual.greet.hi())
# import a.b imports a first, then a.b, and binds only the name "virtual".
for name, how in calls:
    print("find_spec:", name, how)
print("virtual" in dir(), "greet" in dir())
print(virtual.__path__ == [], virtual.greet.__package__)
print(type(virtual.__spec__.loader).__name__)  # DictLoader

# Cached now: a second import never asks any finder.
calls.clear()
import virtual.config
print(calls)

# A name nobody can find: every finder returned None.
try:
    import virtual.missing
except ModuleNotFoundError as e:
    print(type(e).__name__ + ":", e, "| e.name =", e.name)

# Relative imports are resolved against __package__ before any search.
print(importlib.util.resolve_name("..utils", "virtual.sub"))
print(importlib.util.resolve_name(".config", "virtual"))` },
    ],
  },
  {
    title: `Why use virtual environments?`,
    difficulty: "easy",
    seoDescription: `Why Python projects use virtual environments: isolated site-packages, pinned versions, sys.prefix vs base_prefix, pyvenv.cfg and PEP 668.`,
    description: `**Question presented to candidate:**
"Why do Python developers create a virtual environment for each project? What problem does it solve, what is actually inside one, and how does Python know it is running in one?"

**What a strong answer should cover:**
- Without isolation, every project shares one \`site-packages\`, so only one version of each library can be installed; two projects needing different versions conflict, and installing into the system Python can break OS tools
- A virtual environment is a folder with its own \`site-packages\`, a \`python\` link (or copy) to a base interpreter, and a \`pyvenv.cfg\`; it shares the base interpreter and standard library, it is not a copy of Python
- Python detects it at start-up from \`pyvenv.cfg\` next to or one level above the executable, and sets \`sys.prefix\` to the venv while \`sys.base_prefix\` stays at the base install; \`sys.prefix != sys.base_prefix\` means "in a venv"
- Activation only changes \`PATH\` (and \`VIRTUAL_ENV\`, the prompt); running the venv's \`python\` directly works without activating
- Reproducibility comes from pinning what goes into the venv (\`requirements.txt\`, a lockfile such as \`uv.lock\`); the venv itself is disposable and should not be committed
- PEP 668 "externally managed" system Pythons (Debian 12, Ubuntu 23.04+) now refuse \`pip install\` outside a venv; \`python -m venv\` (PEP 405, Python 3.3) or \`uv venv\` are the standard tools

**Code / implementation expected:** Optional — the \`python -m venv .venv\` / activate / install workflow, or checking \`sys.prefix\` against \`sys.base_prefix\`.`,
    answer: `**Target Audience:** Beginners setting up their first Python projects, and anyone preparing for a Python interview
**Difficulty:** Easy
**Python version:** Example 1 was run on CPython 3.11 and in this page (Pyodide 0.25.1, CPython 3.11.3); Example 2 creates a real environment, so it was run on CPython 3.12 outside the browser. The shell output below is from python3.11 on Linux.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Picture one shared office kitchen for a whole building. Team A's recipe needs the old blender, team B's needs the new one, and there is only room for one blender on the counter. Every time team B swaps it, team A's lunch breaks. Then someone from facilities, whose coffee machine depends on that same counter, finds it rearranged and their machine stops working.

That is Python without virtual environments. By default, every package you \`pip install\` goes into **one shared folder** belonging to that Python installation. Project A needs \`fastjson 1.4\`, project B needs \`fastjson 2.0\`, and the folder can hold only one of them. Worse, on Linux the operating system's own tools are written in Python and use that same folder.

A **virtual environment** gives each project its own small kitchen: its own shelf of installed packages, while still sharing the same building (the Python interpreter and its standard library). It is cheap to create, cheap to throw away, and it is the first thing a senior developer sets up in a new project.

## 2. Where Installed Packages Live

When you \`pip install fastjson\`, pip copies the package's files into a folder called **\`site-packages\`** (Debian and Ubuntu call the system one \`dist-packages\`). When you later \`import fastjson\`, Python finds it because that folder is on \`sys.path\`, the list of places the [import system](/interview-question/how-does-the-python-import-system-work) searches.

📌 **Interview term: \`site-packages\`** — the folder where third-party packages are installed for one Python environment. It is on \`sys.path\`, so anything inside can be imported.

One folder can hold only one copy of \`fastjson/\`. Example 1 shows the consequence: it "installs" version 1.4 and then 2.0 into one shared folder, and project A, which needed 1.4, gets \`2.0\`. With one folder per project, project A gets \`1.4\` and project B gets \`2.0\`, side by side.

📌 **Interview term: Dependency conflict** — two projects (or two libraries) that need incompatible versions of the same package. With a single shared \`site-packages\` it cannot be satisfied.

## 3. What a Virtual Environment Is

A virtual environment ("venv") is **just a folder**. Creating one on our machine with \`python3.11 -m venv --without-pip .venv\` produced:

~~~text
.venv/
├── bin/          activate scripts, and python -> python3.11 -> /usr/bin/python3.11
├── include/
├── lib/
│   └── python3.11/site-packages/     empty: this project's own packages go here
├── lib64 -> lib
└── pyvenv.cfg
~~~

and this \`pyvenv.cfg\` (the \`command\` line is shortened here):

~~~ini
home = /usr/bin
include-system-site-packages = false
version = 3.11.17
executable = /usr/bin/python3.11
command = /usr/bin/python3.11 -m venv --without-pip .../.venv
~~~

Notice what is **not** there: no copy of the standard library and, on Linux, no copy of the interpreter. \`bin/python\` is a symbolic link to the base Python. A venv is an **empty \`site-packages\` plus a marker file** that tells the interpreter to use it.

📌 **Interview term: Virtual environment** — a folder with its own \`site-packages\`, a \`python\` executable that is a link to (or copy of) a base interpreter, and a \`pyvenv.cfg\` marker. Built into Python as the \`venv\` module since 3.3 (PEP 405).

📌 **Interview term: Base interpreter** — the real Python installation a venv was created from; its standard library is shared by every venv made from it.

The \`venv\` module arrived in Python 3.3 through PEP 405, which What's New in 3.3 describes as giving each environment "its own private site packages" while sharing a system-wide base install, inspired by the third-party \`virtualenv\` package ([What's New In Python 3.3](https://docs.python.org/3/whatsnew/3.3.html)).

## 4. How Python Knows It Is in a Venv

<svg class="iq-diagram" width="100%" viewBox="0 0 700 320" role="img" aria-label="Start-up of python from a venv. The interpreter finds pyvenv.cfg one level above its executable, sets sys.prefix to the venv folder, keeps sys.base_prefix at the base install, and puts the venv site-packages on sys.path while the standard library still comes from the base install.">
  <defs>
    <marker id="ve1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="220" height="70" rx="10"/>
  <text class="d-text" x="140" y="60" text-anchor="middle">.venv/bin/python</text>
  <text class="d-sub" x="140" y="84" text-anchor="middle">starts up</text>
  <rect class="d-box-accent" x="320" y="30" width="350" height="70" rx="10"/>
  <text class="d-text" x="495" y="60" text-anchor="middle">finds .venv/pyvenv.cfg</text>
  <text class="d-sub" x="495" y="84" text-anchor="middle">one folder above bin, or in bin</text>
  <rect class="d-box" x="30" y="190" width="300" height="100" rx="10"/>
  <text class="d-text" x="180" y="220" text-anchor="middle">sys.prefix = .venv</text>
  <text class="d-sub" x="180" y="246" text-anchor="middle">site-packages from the venv</text>
  <text class="d-sub" x="180" y="270" text-anchor="middle">pip installs land here</text>
  <rect class="d-box-muted" x="370" y="190" width="300" height="100" rx="10"/>
  <text class="d-text" x="520" y="220" text-anchor="middle">sys.base_prefix = /usr</text>
  <text class="d-sub" x="520" y="246" text-anchor="middle">standard library from here</text>
  <text class="d-sub" x="520" y="270" text-anchor="middle">shared by every venv</text>
  <path class="d-edge" d="M 250 65 L 316 65" marker-end="url(#ve1-arrow)"/>
  <path class="d-edge" d="M 440 100 L 230 186" marker-end="url(#ve1-arrow)"/>
  <path class="d-edge-dashed" d="M 540 100 L 530 186" marker-end="url(#ve1-arrow)"/>
</svg>

At start-up the interpreter looks for \`pyvenv.cfg\` one folder above its own executable (it also accepts one in the same folder; we tried both on 3.11). If it finds the file, it sets **\`sys.prefix\`** to the venv folder and uses the venv's \`site-packages\`, while **\`sys.base_prefix\`** keeps pointing at the base installation, whose standard library it still uses. Without the file the venv's \`python\` behaves exactly like the base one: we deleted \`pyvenv.cfg\` from a test venv and \`sys.prefix\` went back to \`/usr\`.

📌 **Interview term: \`sys.prefix\` / \`sys.base_prefix\`** — the root of the running environment and the root of the base installation. They differ only inside a virtual environment, so \`sys.prefix != sys.base_prefix\` is the standard "am I in a venv?" check.

📌 **Interview term: \`pyvenv.cfg\`** — the small config file that marks a folder as a venv: \`home\` (the base interpreter folder), \`include-system-site-packages\`, \`version\`. Its presence is what makes the interpreter switch prefixes.

Here is \`sys.path\` from the venv's python and from the base python on our machine (the venv path is shortened to \`...\`):

~~~text
venv: ['', '/usr/lib/python311.zip', '/usr/lib/python3.11', '/usr/lib/python3.11/lib-dynload', '.../.venv/lib/python3.11/site-packages']
base: ['', '/usr/lib/python311.zip', '/usr/lib/python3.11', '/usr/lib/python3.11/lib-dynload', '/usr/local/lib/python3.11/dist-packages', '/usr/lib/python3/dist-packages']
~~~

The standard library entries are identical. Only the last part differs: the venv sees **its own** \`site-packages\` and **none** of the system ones (because \`include-system-site-packages = false\`). That single difference is the whole isolation.

## 5. What "Activating" Really Does

~~~bash
python -m venv .venv            # create
source .venv/bin/activate       # macOS / Linux  (Windows: .venv\\Scripts\\activate)
python -m pip install fastjson  # goes into .venv/lib/.../site-packages
deactivate                      # undo the PATH change
~~~

The \`activate\` script is not magic. On our machine it sets \`VIRTUAL_ENV\` to the venv folder, saves the old value in \`_OLD_VIRTUAL_PATH\`, puts \`$VIRTUAL_ENV/bin\` at the **front of \`PATH\`**, and changes the prompt. So after activation, typing \`python\` or \`pip\` finds the venv's copies first. That is all.

It follows that you **never need to activate**: running \`.venv/bin/python script.py\` directly uses the venv, which is how cron jobs, Dockerfiles, IDEs and tools like \`uv run\` do it.

📌 **Interview term: Activation** — sourcing the venv's \`activate\` script, which only prepends the venv's \`bin\` folder to \`PATH\` and sets \`VIRTUAL_ENV\`. Convenient, never required.

Prefer \`python -m pip\` over a bare \`pip\`: it guarantees the pip you run belongs to the \`python\` you mean.

## 6. Why It Matters: The Four Real Reasons

| Reason | What goes wrong without a venv | What the venv gives you |
| :--- | :--- | :--- |
| **Isolation** | project B's upgrade breaks project A | one \`site-packages\` per project |
| **Reproducibility** | "works on my machine": unknown leftovers in a global folder | a clean folder you can rebuild from a pinned list |
| **Protecting the OS** | \`sudo pip install\` overwrites packages that system tools use | the system Python is never touched |
| **Permissions and safety** | needing root to install, mixing user and system files | everything lives in a folder you own |

**Reproducibility needs a pin list too.** A venv isolates; it does not remember. You record what is inside with \`pip freeze > requirements.txt\`, or better with a lockfile from a tool such as uv (\`uv.lock\`), and rebuild with one command. Treat the \`.venv\` folder as **disposable**: never commit it (it contains absolute paths and links to one machine's interpreter), delete and recreate it freely. How uv automates this has its own page: [what uv is and why it is replacing pip and Poetry](/interview-question/what-is-uv-and-why-is-it-replacing-pip-poetry-in-2025-26).

### The system Python now refuses

Modern Linux distributions mark their Python as **externally managed** (PEP 668). They ship an \`EXTERNALLY-MANAGED\` file in the standard library folder, and pip then refuses to install into that environment with an \`externally-managed-environment\` error; Debian 12 and Ubuntu 23.04 were among the first to do this ([pydevtools: What is PEP 668?](https://pydevtools.com/handbook/explanation/what-is-pep-668/)). The intended fix is a venv for project dependencies (or pipx / \`uv tool\` for command-line tools), not \`--break-system-packages\`. The python3.11 on our test machine does not ship that file, so we could not show the error itself.

📌 **Interview term: Externally managed environment (PEP 668)** — a Python installation owned by the OS package manager, marked with an \`EXTERNALLY-MANAGED\` file so that pip refuses to modify it.

## 7. Creating One Is Cheap

On our machine, the median of three runs of each command was:

| Command | Time | What it put in \`site-packages\` |
| :--- | :--- | :--- |
| \`python3.11 -m venv x\` | 3.92 s | pip (installed by \`ensurepip\`) |
| \`python3.11 -m venv --without-pip x\` | 0.046 s | nothing |
| \`uv venv x\` | 0.029 s | only uv's \`_virtualenv.pth\` helper |

Almost all the time of a plain \`python -m venv\` is spent installing pip into it; the environment itself is a few files and links. Numbers vary by machine, but the shape (bootstrapping pip dominates) does not.

### Venv vs the alternatives

| Tool | What it isolates | Typical use |
| :--- | :--- | :--- |
| \`venv\` (stdlib) | packages, sharing a base interpreter | the default for any project |
| \`virtualenv\` (third party) | the same, with extra options | older projects, more features |
| \`uv venv\` / \`uv sync\` | the same \`pyvenv.cfg\` venv, created and filled by uv | modern projects managed with uv |
| conda environments | packages **and** the interpreter and non-Python libraries | data science with C / CUDA dependencies |
| Docker containers | the whole OS user space | deployment, full system isolation |

A container does not replace a venv: many Dockerfiles still create one inside the image, so the OS Python stays untouched.

## 8. Verified: Running the Code

**Example 1** was saved as \`main.py\` and run with \`python3.11 main.py\`, and again in this page (Pyodide 0.25.1); the output was identical. It models installs as files in folders, so it runs in the browser. It prints:

~~~text
global env, project A wants 1.4, gets: 2.0
project A venv gets: 1.4
project B venv gets: 2.0
this interpreter is in a venv: False
['executable', 'home', 'include-system-site-packages', 'version']
false
base interpreter lives in: /usr/bin
~~~

**Example 2** creates a real virtual environment with \`venv.EnvBuilder(with_pip=False)\`, drops a module into its \`site-packages\`, and runs a probe in both the venv's python and the base python with \`subprocess\`. Browsers cannot start processes, so it is shown with an "Open in playground" button; we ran it with \`python3.12 main.py\` on Linux. The base-python lines show this machine's Debian/Ubuntu layout (\`/usr\` and \`dist-packages\`); yours will differ. It printed:

~~~text
files in the venv root: ['bin', 'include', 'lib', 'lib64', 'pyvenv.cfg']
pyvenv.cfg keys: ['command', 'executable', 'home', 'include-system-site-packages', 'version']
--- venv python ---
in venv: True
prefix is the venv folder: .venv
base_prefix is the base install: True
site-packages: lib/python3.12/site-packages
hello_pkg: imported from the venv
--- base python ---
in venv: False
prefix is the venv folder: usr
base_prefix is the base install: True
site-packages: local/lib/python3.12/dist-packages
hello_pkg: not installed here
~~~

**What the output shows:** one shared folder gave project A the wrong version, while one folder per project gave each its own. Inside a real venv \`sys.prefix\` is the venv folder, \`sys.base_prefix\` is the shared base install, the venv has its own \`site-packages\`, and a package installed there is importable from the venv's python but not from the base python.

## 9. Edge Cases

- **\`--system-site-packages\`** sets \`include-system-site-packages = true\`, so the venv also sees the base installation's packages (venv packages win). Useful for heavy system-provided libraries, at the cost of isolation.
- **Moving or renaming a venv breaks it.** Scripts in \`bin/\` contain absolute paths. Recreate it instead.
- **Upgrading the base Python** (for example 3.11 to 3.12) leaves old venvs pointing at an interpreter that may be gone; recreate them.
- **Windows** uses \`Scripts\\\` instead of \`bin/\` and \`Lib\\site-packages\`; the logic is the same.
- **A venv is not a security sandbox.** Code in it can read your files and use the network like any other process.

## Common Pitfalls

- **Installing with a \`pip\` that belongs to another Python.** Use \`python -m pip\`, or check \`which python\` / \`sys.executable\`.
- **Committing \`.venv\` to git.** It holds machine-specific links and paths. Commit \`pyproject.toml\` and the lockfile instead.
- **Thinking activation is required.** Calling \`.venv/bin/python\` directly is enough and is what CI and Docker should do.
- **Using a venv without pinning.** \`pip install requests\` today and next month give different versions; record versions in a lockfile or \`requirements.txt\`.
- **\`sudo pip install\` into the system Python**, or \`--break-system-packages\` to silence PEP 668. Both risk breaking OS tools.
- **Sharing one venv across unrelated projects**, which brings the original conflict straight back.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The problem:</strong> <span style="color:#f0e2c8;">Without isolation every project shares one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">site-packages</code>, which holds one version of each library, so projects conflict and installs can break OS tools that use the system Python.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What a venv is:</strong> <span style="color:#f0e2c8;">A folder with its own empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">site-packages</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python</code> that links to a base interpreter, and a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyvenv.cfg</code>; the standard library is shared, not copied.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. How it works:</strong> <span style="color:#f0e2c8;">At start-up Python finds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyvenv.cfg</code> above its executable and sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.prefix</code> to the venv while <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.base&#95;prefix</code> stays at the base install; only the venv <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">site-packages</code> is on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.path</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Activation:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">activate</code> just puts <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.venv/bin</code> first on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PATH</code> and sets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VIRTUAL&#95;ENV</code>; calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.venv/bin/python</code> directly works the same.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reproducibility:</strong> <span style="color:#f0e2c8;">The venv is disposable; pin its contents with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requirements.txt</code> or a lockfile like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code>, and note that PEP 668 systems refuse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pip install</code> outside a venv.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check from code whether you are in a virtual environment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.prefix</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.base&#95;prefix</code>; they differ only inside a venv. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">VIRTUAL&#95;ENV</code> variable is set by activation only, so it is not reliable when the venv python is called directly.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does a venv copy the Python interpreter?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On Linux and macOS <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bin/python</code> is a symlink to the base interpreter by default, and the standard library is never copied. That is why a venv is small, fast to create, and breaks if the base Python is removed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">include-system-site-packages = true</code> change?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The base installation <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">site-packages</code> are added to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.path</code> after the venv one, so system packages are visible. You trade isolation for not reinstalling large libraries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use Docker instead?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A container isolates the whole OS, which is great for deployment, but inside it the OS Python is still shared with system tools. Many images create a venv in the container too, and local development still needs per-project isolation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">externally-managed-environment</code> error?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">PEP 668: the distro marks its Python with an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">EXTERNALLY-MANAGED</code> file and pip refuses to install there. Create a venv for the project, or use pipx or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv tool</code> for CLI tools.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`site-packages\`** | the folder where an environment's third-party packages are installed |
| **Dependency conflict** | two projects needing incompatible versions of one package |
| **Virtual environment** | a folder with its own \`site-packages\`, a linked \`python\` and a \`pyvenv.cfg\` |
| **Base interpreter** | the real Python installation a venv was created from |
| **\`sys.prefix\` / \`sys.base_prefix\`** | root of the running environment / of the base install |
| **\`pyvenv.cfg\`** | marker file that makes the interpreter switch into venv mode |
| **Activation** | prepending the venv \`bin\` to \`PATH\`; optional |
| **Externally managed environment** | an OS-owned Python where pip refuses to install (PEP 668) |

---
**Conclusion:** A virtual environment solves a simple problem: one \`site-packages\` can hold only one version of each package, and the system Python belongs to the operating system. A venv is just a folder with its own \`site-packages\`, a link to a base interpreter and a \`pyvenv.cfg\` that makes Python set \`sys.prefix\` to it at start-up; activation only edits \`PATH\`. Create one per project, never commit it, pin what goes into it with a lockfile, and remember that on modern Linux the system Python will refuse to let you skip this step.
`,
    examples: [
      { label: `Two projects, two versions: one shared folder vs one folder each`, code: `# Why one shared site-packages folder cannot serve two projects,
# and how a per-project folder on sys.path fixes it.
import importlib
import os
import sys
import tempfile

base = tempfile.mkdtemp()

def install(env, version):
    # "Installing" a package means copying its files into site-packages.
    site = os.path.join(base, env, "lib", "site-packages")
    os.makedirs(os.path.join(site, "fastjson"), exist_ok=True)
    with open(os.path.join(site, "fastjson", "__init__.py"), "w") as f:
        f.write("__version__ = " + repr(version) + "\\n")
    return site

# One global folder: the second install overwrites the first.
shared = install("global", "1.4")
shared = install("global", "2.0")

# One folder per project: both versions exist side by side.
site_a = install("project_a_venv", "1.4")
site_b = install("project_b_venv", "2.0")

def import_in(site):
    # What a different interpreter prefix does: a different folder on sys.path.
    sys.modules.pop("fastjson", None)
    sys.path.insert(0, site)
    importlib.invalidate_caches()
    try:
        return importlib.import_module("fastjson").__version__
    finally:
        sys.path.remove(site)

print("global env, project A wants 1.4, gets:", import_in(shared))
print("project A venv gets:", import_in(site_a))
print("project B venv gets:", import_in(site_b))

# How a running interpreter tells you whether it is inside a venv.
def in_venv():
    return sys.prefix != sys.base_prefix

print("this interpreter is in a venv:", in_venv())

# What site.py reads at start-up: pyvenv.cfg next to (or one level above) python.
SAMPLE_CFG = """home = /usr/bin
include-system-site-packages = false
version = 3.11.17
executable = /usr/bin/python3.11
"""

def parse_pyvenv_cfg(text):
    conf = {}
    for line in text.splitlines():
        key, sep, value = line.partition("=")
        if sep:
            conf[key.strip().lower()] = value.strip()
    return conf

cfg = parse_pyvenv_cfg(SAMPLE_CFG)
print(sorted(cfg))
print(cfg["include-system-site-packages"])  # false
print("base interpreter lives in:", cfg["home"])` },
      { label: `Create a real venv and compare it with the base interpreter`, runnable: false, python: "3.12", code: `# A real virtual environment, created and inspected from Python.
# Needs a real interpreter and subprocess, so it does not run in the browser.
import os
import subprocess
import sys
import tempfile
import venv

work = tempfile.mkdtemp()
env_dir = os.path.join(work, ".venv")
venv.EnvBuilder(with_pip=False).create(env_dir)    # same as: python -m venv --without-pip .venv

bindir = "Scripts" if os.name == "nt" else "bin"
env_python = os.path.join(env_dir, bindir, "python")

print("files in the venv root:", sorted(os.listdir(env_dir)))
with open(os.path.join(env_dir, "pyvenv.cfg")) as f:
    keys = [line.split("=")[0].strip() for line in f if "=" in line]
print("pyvenv.cfg keys:", sorted(keys))

PROBE = r'''
import sys, sysconfig, os
print("in venv:", sys.prefix != sys.base_prefix)
print("prefix is the venv folder:", os.path.basename(sys.prefix))
print("base_prefix is the base install:", sys.base_prefix == BASE)
site = sysconfig.get_paths()["purelib"]
print("site-packages:", os.path.relpath(site, sys.prefix).replace(os.sep, "/"))
try:
    import hello_pkg
    print("hello_pkg:", hello_pkg.MSG)
except ImportError:
    print("hello_pkg: not installed here")
'''

def run(python):
    code = "BASE = " + repr(sys.base_prefix) + "\\n" + PROBE
    out = subprocess.run([python, "-c", code], capture_output=True, text=True, check=True)
    return out.stdout

# "Install" a package into the venv only: drop a module into its site-packages.
site = subprocess.run([env_python, "-c", "import sysconfig; print(sysconfig.get_paths()['purelib'])"],
                      capture_output=True, text=True, check=True).stdout.strip()
with open(os.path.join(site, "hello_pkg.py"), "w") as f:
    f.write('MSG = "imported from the venv"\\n')

print("--- venv python ---")
print(run(env_python), end="")
print("--- base python ---")
print(run(sys.executable), end="")` },
    ],
  },
  {
    title: `What is uv and why is it replacing pip/poetry in 2025-26?`,
    difficulty: "easy",
    seoDescription: `What uv is: one fast Rust tool for Python versions, venvs, locking, scripts and tools, and why teams move from pip, pip-tools and Poetry.`,
    description: `**Question presented to candidate:**
"A lot of teams moved their Python projects to uv over the last two years. What is uv, what does it replace, and why are people switching from pip, pip-tools and Poetry? Are there reasons not to?"

**What a strong answer should cover:**
- uv is a single Rust binary from Astral that covers installing packages (\`uv pip\`), creating venvs, locking and syncing projects (\`uv add\`, \`uv lock\`, \`uv sync\`, \`uv run\`), running tools (\`uvx\`), running single-file scripts with inline metadata (PEP 723) and installing Python itself (\`uv python install\`)
- Speed comes from a Rust resolver, parallel downloads and a global cache that installs by cloning or hard-linking files into each venv; warm-cache operations take milliseconds
- Projects are standards-based: \`[project]\` in \`pyproject.toml\`, PEP 735 \`[dependency-groups]\`, and a cross-platform \`uv.lock\` committed to git; \`uv run\` keeps the venv in sync automatically
- Compared with pip: pip installs into an environment but has no project lockfile workflow (an experimental \`pip lock\` arrived in pip 25.1); compared with Poetry: similar workflow, but uv also manages Python versions and tools, and is much faster
- Trade-offs and context: \`uv.lock\` is uv-specific (it can export \`requirements.txt\` or PEP 751 \`pylock.toml\`), pip remains the default installer that ships with Python, and the company behind uv is being acquired by OpenAI (announced March 2026), with a stated commitment to keep it open source

**Clarifying questions expected:**
- Is this an application (lockfile matters) or a library published to PyPI (ranges matter)?
- What does the team use today, and does CI or deployment depend on \`requirements.txt\`?

**Code / implementation expected:** Optional — the basic \`uv init\` / \`uv add\` / \`uv run\` workflow, or a PEP 723 script header.`,
    answer: `**Target Audience:** Python developers who know pip and venv and keep hearing about uv, and candidates asked about modern Python tooling
**Difficulty:** Easy
**Python version:** The in-page examples were run on CPython 3.11 and in this page (Pyodide 0.25.1, CPython 3.11.3). The shell sessions were run with uv 0.11.32 on Linux against python3.11; uv changes quickly, so check \`uv --version\` and the docs for your release.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Setting up a Python project used to feel like assembling furniture from five different shops. One shop sold you the Python version (pyenv). Another sold the empty room (venv or virtualenv). A third sold the installer (pip). A fourth sold the "write down exactly what we bought" receipt (pip-tools, or Poetry with its own way of doing everything). A fifth sold a separate shelf for command-line tools (pipx). Each had its own manual, and they did not always agree.

**uv** is one shop that sells all of it, and delivers in seconds instead of minutes. You tell it "this project needs Python 3.11 and httpx", and it fetches the Python version if needed, creates the venv, resolves and records exact versions in a lockfile, installs them, and runs your code. That combination of **one tool** and **very fast** is why so many teams switched during 2024 to 2026.

Interviewers ask about it to see whether you know the modern workflow, and whether you understand the ideas underneath it (venvs, lockfiles, \`pyproject.toml\`) rather than just the brand name.

## 2. What uv Is

uv is a Python package and project manager written in Rust by **Astral** (the company behind the Ruff linter). It ships as a standalone executable plus a small \`uvx\` alias; it does not need Python to be installed first. On our machine \`uv --help\` describes it as "An extremely fast Python package manager." and lists these commands:

~~~text
  auth       Manage authentication
  run        Run a command or script
  init       Create a new project
  add        Add dependencies to the project
  remove     Remove dependencies from the project
  version    Read or update the project's version
  sync       Update the project's environment
  lock       Update the project's lockfile
  export     Export the project's lockfile to an alternate format
  tree       Display the project's dependency tree
  format     Format Python code in the project
  check      Run checks on the project
  audit      Audit the project's dependencies
  tool       Run and install commands provided by Python packages
  python     Manage Python versions and installations
  pip        Manage Python packages with a pip-compatible interface
  venv       Create a virtual environment
  build      Build Python packages into source distributions and wheels
  publish    Upload distributions to an index
  workspace  Inspect uv workspaces
  cache      Manage uv's cache
  self       Manage the uv executable
  help       Display documentation for a command
~~~

A short history, from the sources linked:

- **February 2024:** Astral announced uv as a fast drop-in replacement for \`pip\` and \`pip-tools\` ([Astral blog](https://astral.sh/blog/uv); [Simon Willison, 15 Feb 2024](https://simonwillison.net/2024/Feb/15/uv-python-packaging-in-rust/)).
- **August 2024, uv 0.3.0:** project management (\`uv init\`, \`uv add\`, \`uv lock\`, \`uv sync\`, \`uv run\`), a universal cross-platform lockfile, workspaces, tool management (\`uvx\`) and Python installation were declared stable ([Astral: uv unified Python packaging](https://astral.sh/blog/uv-unified-python-packaging)).
- **October 2024, uv 0.4.27:** support for the new standard \`[dependency-groups]\` table (PEP 735) ([pydevtools: What is PEP 735?](https://pydevtools.com/handbook/explanation/what-is-pep-735/)).
- **March 2026:** OpenAI announced it would acquire Astral, with the team joining Codex; both sides said uv, Ruff and ty stay open source, and at the time of the reports the deal still needed regulatory approval ([The New Stack](https://thenewstack.io/openai-astral-acquisition/); [Simon Willison](https://simonw.substack.com/p/thoughts-on-openai-acquiring-astral)). We could not confirm whether it has closed.

📌 **Interview term: uv** — a Rust-based, all-in-one Python package and project manager from Astral: installer, resolver, lockfile, venv manager, tool runner and Python version manager.

## 3. What It Replaces

<svg class="iq-diagram" width="100%" viewBox="0 0 700 330" role="img" aria-label="Six older tools, pyenv, venv or virtualenv, pip, pip-tools, Poetry and pipx, each map to a uv command: uv python, uv venv, uv pip, uv lock, uv add and uv sync, and uvx.">
  <defs>
    <marker id="uv1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="20" width="200" height="40" rx="8"/>
  <text class="d-text" x="130" y="45" text-anchor="middle">pyenv</text>
  <rect class="d-box-muted" x="30" y="70" width="200" height="40" rx="8"/>
  <text class="d-text" x="130" y="95" text-anchor="middle">venv / virtualenv</text>
  <rect class="d-box-muted" x="30" y="120" width="200" height="40" rx="8"/>
  <text class="d-text" x="130" y="145" text-anchor="middle">pip</text>
  <rect class="d-box-muted" x="30" y="170" width="200" height="40" rx="8"/>
  <text class="d-text" x="130" y="195" text-anchor="middle">pip-tools</text>
  <rect class="d-box-muted" x="30" y="220" width="200" height="40" rx="8"/>
  <text class="d-text" x="130" y="245" text-anchor="middle">Poetry / PDM</text>
  <rect class="d-box-muted" x="30" y="270" width="200" height="40" rx="8"/>
  <text class="d-text" x="130" y="295" text-anchor="middle">pipx</text>
  <rect class="d-box-accent" x="440" y="20" width="230" height="40" rx="8"/>
  <text class="d-text" x="555" y="45" text-anchor="middle">uv python install</text>
  <rect class="d-box-accent" x="440" y="70" width="230" height="40" rx="8"/>
  <text class="d-text" x="555" y="95" text-anchor="middle">uv venv</text>
  <rect class="d-box-accent" x="440" y="120" width="230" height="40" rx="8"/>
  <text class="d-text" x="555" y="145" text-anchor="middle">uv pip install</text>
  <rect class="d-box-accent" x="440" y="170" width="230" height="40" rx="8"/>
  <text class="d-text" x="555" y="195" text-anchor="middle">uv pip compile / uv lock</text>
  <rect class="d-box-accent" x="440" y="220" width="230" height="40" rx="8"/>
  <text class="d-text" x="555" y="245" text-anchor="middle">uv add / sync / run</text>
  <rect class="d-box-accent" x="440" y="270" width="230" height="40" rx="8"/>
  <text class="d-text" x="555" y="295" text-anchor="middle">uvx / uv tool install</text>
  <path class="d-edge" d="M 230 40 L 436 40" marker-end="url(#uv1-arrow)"/>
  <path class="d-edge" d="M 230 90 L 436 90" marker-end="url(#uv1-arrow)"/>
  <path class="d-edge" d="M 230 140 L 436 140" marker-end="url(#uv1-arrow)"/>
  <path class="d-edge" d="M 230 190 L 436 190" marker-end="url(#uv1-arrow)"/>
  <path class="d-edge" d="M 230 240 L 436 240" marker-end="url(#uv1-arrow)"/>
  <path class="d-edge" d="M 230 290 L 436 290" marker-end="url(#uv1-arrow)"/>
</svg>

Each older tool on the left still works; uv offers one command family per job. You can adopt it in two ways:

1. **As a faster pip** (\`uv pip install\`, \`uv pip compile\`, \`uv pip sync\`, \`uv venv\`). Your files stay the same (\`requirements.txt\`); only the commands change. This is the low-risk first step.
2. **As a project manager** (\`uv init\`, \`uv add\`, \`uv lock\`, \`uv sync\`, \`uv run\`). Dependencies live in \`pyproject.toml\`, exact versions in \`uv.lock\`.

The tool side is visible on our test machine: \`black\`, \`mypy\`, \`pytest\`, \`ruff\`, \`pyright\` and even \`poetry\` in \`~/.local/bin\` are links into \`~/.local/share/uv/tools/<name>/bin/\`. \`uv tool install\` gave each tool its own private venv, which is what pipx used to do.

## 4. The Project Workflow

~~~bash
uv init weather-cli          # pyproject.toml, .python-version, README.md, main.py
cd weather-cli
uv add httpx rich            # edit [project].dependencies, lock, sync .venv
uv add --dev pytest ruff     # goes into [dependency-groups].dev
uv run main.py               # lock + sync if needed, then run inside .venv
uv lock --check              # CI: fail if uv.lock is out of date
uv sync --locked             # CI / Docker: install exactly what uv.lock says
~~~

What uv writes, from a real \`uv init --lib\` on our machine with uv 0.11.32 (authors removed):

~~~toml
[project]
name = "acme"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.13"
dependencies = []

[build-system]
requires = ["uv_build>=0.11.32,<0.12.0"]
build-backend = "uv_build"
~~~

The \`requires-python\` came from the default interpreter uv picked, and the build backend is uv's own \`uv_build\` (\`--build-backend\` can pick hatch, setuptools, flit, pdm, poetry and others). The \`[project]\` table is the standard one from the packaging specs, so pip, Poetry 2 and other tools can read the same file. How \`pyproject.toml\` and \`tomllib\` fit together has its own page: [pyproject.toml, tomllib and uv workflows](/interview-question/how-do-pyproject-toml-tomllib-and-uv-pyproject-workflows-fit-together).

📌 **Interview term: Lockfile** — a file that records the exact version (and file hashes) of every package, including indirect dependencies, so every machine installs the same set. uv's is \`uv.lock\`, a TOML file you commit to git.

📌 **Interview term: Sync** — making the venv match the lockfile exactly: installing what is missing, upgrading what differs and removing what is not listed (\`uv sync --inexact\` keeps extras). In a project, \`uv run\` creates and updates the environment before running the command (its help says so), so the environment cannot silently drift.

**Locking is universal.** A pip-tools \`requirements.txt\` is usually resolved for the machine that ran the command. \`uv.lock\` is resolved once for every platform and Python version allowed by \`requires-python\`, with environment markers where they differ, so a Mac developer and a Linux CI runner use the same file. Example 2 reads a real \`uv.lock\` and shows what it records: the pinned version, the source (\`registry\` or \`virtual\` for the project itself), URLs and \`sha256\` hashes, and the original requirement (\`iniconfig>=2\`) so that uv can tell when the lock is stale. On our run, \`uv lock --check\` passed, and after adding \`pytest\` to the group it failed with:

~~~text
error: The lockfile at \`uv.lock\` needs to be updated, but \`--check\` was provided.
~~~

## 5. Why It Is Fast

| Technique | What it means |
| :--- | :--- |
| **Native code** | the resolver, downloader and installer are compiled Rust, not Python |
| **Parallel work** | downloads, metadata fetches and unpacking run concurrently |
| **Global cache** | each wheel is downloaded and unpacked once per machine, under one cache folder |
| **Link, do not copy** | files are put into each venv from the cache by \`clone\`, \`hardlink\`, \`copy\` or \`symlink\` (\`--link-mode\`), so a new venv costs almost nothing |
| **No pip in the venv** | \`uv venv\` does not bootstrap pip; uv installs from outside |

Some concrete numbers. When uv launched, Astral reported it as 8 to 10 times faster than pip without a cache and 80 to 115 times faster with a warm cache ([Simon Willison](https://simonwillison.net/2024/Feb/15/uv-python-packaging-in-rust/)). On our machine, for a project depending on \`fastapi\`, \`httpx\` and \`rich\` (20 packages in total), \`uv lock\` printed \`Resolved 20 packages in 411ms\` with an empty cache and \`in 14ms\` and \`in 10ms\` on the next two runs. Creating an empty venv took 0.029 s with \`uv venv\` against 3.92 s with \`python -m venv\` (most of which is installing pip; 0.046 s with \`--without-pip\`), median of three runs. Numbers depend on the network and the machine; the order of magnitude is the point.

📌 **Interview term: Global cache** — uv's single per-user store of downloaded and unpacked packages, shared by every project and linked into each venv instead of re-downloaded.

## 6. Scripts and Tools Without a Project

**Single-file scripts.** A script can declare its own dependencies in a special comment block, standardised as **inline script metadata** (PEP 723; the packaging spec says it was approved in October 2023, [inline script metadata spec](https://packaging.python.org/en/latest/specifications/inline-script-metadata/)):

~~~python
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "httpx>=0.27",
#   "rich",
# ]
# ///
import httpx
~~~

\`uv run fetch.py\` reads the block, builds a cached throwaway environment and runs the script. We confirmed uv reads that exact block with \`uv tree --script fetch.py --depth 1\`, which resolved it:

~~~text
Resolved 11 packages in 246ms
rich v15.0.0
├── markdown-it-py v4.2.0
└── pygments v2.21.0
httpx v0.28.1
├── anyio v4.15.1
├── certifi v2026.7.22
├── httpcore v1.0.9
└── idna v3.20
~~~

Example 1 parses the same block with a regular expression and \`tomllib\`, so you can see the format is just commented-out TOML.

📌 **Interview term: Inline script metadata (PEP 723)** — a \`# /// script\` comment block at the top of a \`.py\` file holding TOML with \`dependencies\` and \`requires-python\`, so a runner like \`uv run\` or pipx can build its environment.

**Tools.** \`uvx ruff check .\` (short for \`uv tool run\`) runs a command-line tool in a temporary cached environment; \`uv tool install ruff\` keeps it installed in its own venv.

**Python versions.** \`uv python install 3.13\` downloads a managed CPython build, \`uv python pin 3.12\` writes \`.python-version\`, and every uv command picks a matching interpreter (downloading one if allowed).

## 7. uv vs pip vs Poetry

| | pip (+ venv, pip-tools) | Poetry 2 | uv |
| :--- | :--- | :--- | :--- |
| Written in | Python | Python | Rust |
| Install packages | yes | yes | yes (\`uv pip\`, \`uv sync\`) |
| Project lockfile | pip-tools \`requirements.txt\`; experimental \`pip lock\` (PEP 751) since pip 25.1 | \`poetry.lock\` | \`uv.lock\`, cross-platform |
| Standard \`[project]\` table | yes | yes, since 2.0 | yes |
| \`[dependency-groups]\` (PEP 735) | \`pip install --group\` since 25.1 | its own group tables | yes |
| Manages Python versions | no | no | yes |
| Runs CLI tools (pipx role) | no | no | yes (\`uvx\`) |
| Scripts with inline metadata | no | no | yes |
| Ships with Python | yes (\`ensurepip\`) | no | no |

The pip 25.1 entries come from its release announcement ([pip 25.1 release](https://discuss.python.org/t/announcement-pip-25-1-release/89702)); Poetry 2.0.0 (5 January 2025) added support for the standard \`[project]\` section ([Announcing Poetry 2.0.0](https://python-poetry.org/blog/announcing-poetry-2.0.0/)). PEP 751 defines a tool-neutral \`pylock.toml\`, and uv can export to it (\`uv export --format pylock.toml\`, first added in uv 0.6.15 per its changelog; [pydevtools: What is PEP 751?](https://pydevtools.com/handbook/explanation/what-is-pep-751/)).

**Why "replacing" is only partly true.** pip is still the installer that ships with CPython and that most documentation shows; uv's pip interface deliberately mirrors it. Poetry is still maintained and moved toward the standards. What changed is the default choice for **new** projects and CI pipelines, where uv's speed and single-tool workflow are hard to argue with.

### Reasons a team might wait

- \`uv.lock\` is uv-specific. Other tools cannot install from it directly; you export (\`uv export\` to \`requirements.txt\` or \`pylock.toml\`) for them.
- uv moves fast (0.x versions); pin the uv version in CI and read release notes.
- Some behaviour differs from pip on purpose (for example the multiple-index strategy below); check the uv docs on pip compatibility before migrating complicated setups.
- Company policy may care about who governs the tool, especially after the acquisition announcement.

## 8. Verified: Running the Code

Both examples were saved as \`main.py\` and run with \`python3.11 main.py\`, and again in this page (Pyodide 0.25.1); the output was identical. They use only the standard library (\`re\` and \`tomllib\`), so they run in the browser; the real uv commands above were run in a shell.

**Example 1 — inline script metadata and the \`pyproject.toml\` tables uv reads** prints:

~~~text
>=3.11
['httpx>=0.27', 'rich']
None
['httpx>=0.27', 'rich>=13']
['pytest>=8', 'ruff>=0.6']
['default-groups']
['dependency-groups', 'project', 'tool']
~~~

**Example 2 — what a real \`uv.lock\` records, and a toy freshness check** prints:

~~~text
lock format version: 1 | python: >=3.11
demo       0.1.0  source=virtual
iniconfig  2.3.1  source=registry
wheel files recorded: 1
hash algorithm: sha256
pyproject asks for: iniconfig>=2 | lock pins: 2.3.1
True
False
~~~

**What the output shows:** the PEP 723 block is commented TOML that yields \`requires-python\` and \`dependencies\`, and a file without a block gives \`None\`. The lock records one exact version per package (\`2.3.1\`) for a range in \`pyproject.toml\` (\`>=2\`), with its source kind and \`sha256\` hashes, and it stores the original requirements, which is how a freshness check like \`uv lock --check\` can notice that the inputs changed.

## 9. Edge Cases

- **Libraries vs applications.** A library published to PyPI declares ranges in \`[project].dependencies\`; its \`uv.lock\` only pins the developers' and CI's environment, users never see it. Applications deploy from the lock.
- **\`uv pip install\` into a system Python** follows PEP 668 rules like pip; use a venv, or \`--system\` deliberately in containers.
- **Several indexes.** By default uv stops at the first index that has a package (\`--index-strategy first-index\`); its help text says this prevents "dependency confusion" attacks. pip with \`--extra-index-url\` considers all indexes, so a migration can pick different files.
- **Docker:** copy \`pyproject.toml\` and \`uv.lock\` first, run \`uv sync --locked --no-install-project\`, then copy the code, so the dependency layer is cached.

## Common Pitfalls

- **Not committing \`uv.lock\`** for an application. Without it every machine resolves again and you lose reproducibility.
- **Running \`pip install\` inside a uv-managed venv.** The next \`uv sync\` removes what is not in the lock. Use \`uv add\`.
- **Using \`uv sync\` in CI without \`--locked\` or \`--frozen\`**, so a stale lock is silently updated instead of failing the build.
- **Treating uv as magic.** It still creates an ordinary venv with \`pyvenv.cfg\`; everything you know about [virtual environments](/interview-question/why-use-virtual-environments) still applies.
- **Mixing tools on one project** (Poetry lock plus uv lock). Pick one source of truth.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">uv is a Rust-based all-in-one Python package and project manager from Astral: one binary that installs packages, creates venvs, locks, syncs, runs scripts and tools, and installs Python versions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What it replaces:</strong> <span style="color:#f0e2c8;">pip and venv (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv pip</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv venv</code>), pip-tools (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv pip compile</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv lock</code>), Poetry (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv add</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv run</code>), pipx (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uvx</code>) and pyenv (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv python install</code>).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is fast:</strong> <span style="color:#f0e2c8;">compiled resolver, parallel downloads and one global cache whose files are cloned or hard-linked into each venv; warm-cache locks take milliseconds.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Standards:</strong> <span style="color:#f0e2c8;">dependencies live in the standard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project]</code> table and PEP 735 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[dependency-groups]</code>, scripts can use PEP 723 inline metadata, and the cross-platform <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code> is committed and exportable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code> is uv-specific, the tool is still 0.x and fast-moving, pip remains the built-in default, and the OpenAI acquisition announced in March 2026 is a governance question some teams weigh.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">uv.lock</code> different from a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">requirements.txt</code> made by pip-compile?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">pip-compile usually resolves for the current platform and Python. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code> is resolved once for every platform and version allowed by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requires-python</code>, using markers, and it keeps the original requirements so uv can detect a stale lock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">uv run</code> do that <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">python</code> does not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It finds the project, checks that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code> matches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyproject.toml</code>, syncs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.venv</code> to the lock if needed, then runs the command inside that venv. No activation, no drift.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you migrate a pip + <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">requirements.txt</code> project?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Start with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv pip install -r requirements.txt</code> in CI for speed. Then move dependencies into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project].dependencies</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv lock</code>, commit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code>, and switch CI to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync --locked</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv export</code> can keep producing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requirements.txt</code> for old consumers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is uv a different kind of virtual environment?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv venv</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync</code> create a standard venv with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyvenv.cfg</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">site-packages</code>; uv just installs into it from outside, without pip inside the venv.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use uv?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When policy needs only tools shipped with Python, when a platform build relies on conda-only native packages, or when a complex multi-index setup depends on pip-specific resolution. Otherwise it is the sensible default for new projects.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **uv** | Astral's Rust-based all-in-one Python package and project manager |
| **Lockfile** | exact versions and hashes of every package; \`uv.lock\` for uv |
| **Sync** | make the venv match the lockfile exactly |
| **Global cache** | one per-user store of packages linked into every venv |
| **Inline script metadata (PEP 723)** | \`# /// script\` TOML block declaring a script's dependencies |

---
**Conclusion:** uv is one fast, standards-based tool for the whole Python workflow: it installs Python versions, creates ordinary venvs, resolves dependencies from \`pyproject.toml\` into a cross-platform \`uv.lock\`, keeps the venv in sync on every \`uv run\`, and covers scripts and CLI tools too. Teams switch because it replaces five tools with one and turns minutes into seconds, thanks to a compiled resolver and a global cache linked into each environment. Know its trade-offs (a uv-specific lockfile, a fast-moving 0.x tool, pip still the built-in default, a new owner) and the ideas it is built on, and you can answer both "what is uv" and "should we switch".
`,
    examples: [
      { label: `Inline script metadata (PEP 723) and the pyproject tables uv reads`, code: `# PEP 723 inline script metadata: the block "uv run script.py" reads
# to build a throwaway environment for one file.
import re
import tomllib

SCRIPT = '''\\
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "httpx>=0.27",
#   "rich",
# ]
# ///
import httpx
from rich import print
print(httpx.get("https://example.org").status_code)
'''

# The block starts with "# /// TYPE", ends with "# ///", and every line
# in between is a comment. Strip the leading "# " and the rest is TOML.
BLOCK = re.compile(r"(?m)^# /// (?P<type>[a-zA-Z0-9-]+)$\\s(?P<content>(^#(| .*)$\\s)+)^# ///$")

def read_metadata(source):
    for match in BLOCK.finditer(source):
        if match.group("type") == "script":
            lines = match.group("content").splitlines(keepends=True)
            toml_text = "".join(line[2:] if line.startswith("# ") else line[1:] for line in lines)
            return tomllib.loads(toml_text)
    return None

meta = read_metadata(SCRIPT)
print(meta["requires-python"])
print(meta["dependencies"])
print(read_metadata("print('no block here')"))  # None

# The same TOML tables a uv project keeps in pyproject.toml.
PYPROJECT = '''
[project]
name = "weather-cli"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27", "rich>=13"]

[dependency-groups]
dev = ["pytest>=8", "ruff>=0.6"]

[tool.uv]
default-groups = ["dev"]
'''
conf = tomllib.loads(PYPROJECT)
print(conf["project"]["dependencies"])
print(conf["dependency-groups"]["dev"])
print(sorted(conf["tool"]["uv"]))
# pip, uv and Poetry 2 all read [project]; [tool.uv] is uv-only settings.
print(sorted(conf))` },
      { label: `What a real uv.lock records, and a toy freshness check`, code: `# Reading a real uv.lock (from "uv lock" on a project with one test dependency).
import tomllib

UV_LOCK = '''
version = 1
revision = 3
requires-python = ">=3.11"

[[package]]
name = "demo"
version = "0.1.0"
source = { virtual = "." }

[package.dev-dependencies]
test = [
    { name = "iniconfig" },
]

[package.metadata]

[package.metadata.requires-dev]
test = [{ name = "iniconfig", specifier = ">=2" }]

[[package]]
name = "iniconfig"
version = "2.3.1"
source = { registry = "https://pypi.org/simple" }
sdist = { url = "https://files.pythonhosted.org/packages/01/e1/2069291243c926a2ff1cd706c7f3eeb9b62144bf60f77c9fb9ff2fb26bd3/iniconfig-2.3.1.tar.gz", hash = "sha256:67f4b9c50da0dedf52af349e7749a80a9057a5031199791b906c3bb3ae878960", size = 21209, upload-time = "2026-10-06T22:48:38.076Z" }
wheels = [
    { url = "https://files.pythonhosted.org/packages/56/43/4ca9e49d27a1fcf6bece6f6aec0ea46bb9112489b93d4b688fb415457bdb/iniconfig-2.3.1-py3-none-any.whl", hash = "sha256:9121e2c1fdb355232495be3194c8dfe87ccc2d5dee45947b78e68f499790d7a7", size = 7552, upload-time = "2026-10-06T22:48:36.959Z" },
]
'''

lock = tomllib.loads(UV_LOCK)
print("lock format version:", lock["version"], "| python:", lock["requires-python"])
for pkg in lock["package"]:
    kind = next(iter(pkg["source"]))
    print(f"{pkg['name']:<10} {pkg['version']:<6} source={kind}")

ini = next(p for p in lock["package"] if p["name"] == "iniconfig")
print("wheel files recorded:", len(ini["wheels"]))
print("hash algorithm:", ini["wheels"][0]["hash"].split(":")[0])

# pyproject.toml says a RANGE; the lock says the ONE version every machine installs.
demo = next(p for p in lock["package"] if p["name"] == "demo")
wanted = demo["metadata"]["requires-dev"]["test"][0]
print("pyproject asks for:", wanted["name"] + wanted["specifier"], "| lock pins:", ini["version"])

# A toy freshness check, the idea behind "uv lock --check":
# the inputs recorded in the lock must match the inputs in pyproject.toml now.
def lock_is_fresh(pyproject_groups):
    recorded = {g: sorted(r["name"] + r.get("specifier", "") for r in reqs)
                for g, reqs in demo["metadata"]["requires-dev"].items()}
    current = {g: sorted(reqs) for g, reqs in pyproject_groups.items()}
    return recorded == current

print(lock_is_fresh({"test": ["iniconfig>=2"]}))  # True
print(lock_is_fresh({"test": ["iniconfig>=2", "pytest"]}))  # False` },
    ],
  },
  {
    title: `How do uv workspaces and named dependency groups work?`,
    difficulty: "medium",
    seoDescription: `uv workspaces: many packages, one uv.lock and one venv, linked with workspace = true. Dependency groups (PEP 735): dev, include-group, flags.`,
    description: `**Question presented to candidate:**
"Say we have a monorepo with an API service, a worker and a shared core library, all in Python, managed with uv. How would you set it up as a uv workspace, how do the packages depend on each other, and how do you keep test, lint and docs tools out of production installs with dependency groups?"

**What a strong answer should cover:**
- A workspace is a root \`pyproject.toml\` with \`[tool.uv.workspace]\` \`members\` (globs) and optional \`exclude\`; every member keeps its own \`pyproject.toml\`, but there is one \`uv.lock\` and one \`.venv\` at the root, so all members agree on every version
- Members depend on each other by normal name in \`[project].dependencies\` plus \`{ workspace = true }\` in \`[tool.uv.sources]\`; they are installed as editable, and uv errors if the source entry is missing
- Commands work on the root by default and target a member with \`--package\` (or all with \`--all-packages\`); \`requires-python\` is the intersection over all members
- Dependency groups (PEP 735, \`[dependency-groups]\`) are named lists of requirements that are not published in the package metadata, unlike extras in \`[project.optional-dependencies]\`; \`{ include-group = "..." }\` composes them, names are normalised, cycles are errors
- uv installs the \`dev\` group by default; \`--no-dev\`, \`--group\`, \`--only-group\`, \`--all-groups\` and \`[tool.uv] default-groups\` change the selection, and \`[tool.uv] conflicts\` allows groups that cannot be installed together
- Trade-off: one lock means one version of each dependency for the whole repo; members with genuinely incompatible requirements belong in separate projects (or path dependencies)

**Clarifying questions expected:**
- Must every service be deployable and versioned separately, or is it one product?
- Do any members need a different version of a shared dependency, or a different Python?
- Which tools must be in CI only, and which are needed for local development?

**Code / implementation expected:** Yes — sketch the root and member \`pyproject.toml\` tables and the \`uv sync\` / \`uv run --package\` commands.`,
    answer: `**Target Audience:** Developers moving a multi-package Python repo to uv, and candidates asked about Python monorepos and modern packaging
**Difficulty:** Medium
**Python version:** The in-page examples were run on CPython 3.11 and in this page (Pyodide 0.25.1, CPython 3.11.3). Every uv session below was run with uv 0.11.32 on Linux against python3.11; long \`file://\` paths are shortened to \`file://.../\` and the timing in "Resolved N packages in Xms" lines will differ on your machine.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A restaurant group runs three kitchens (the API, the background worker and a shared prep kitchen called "core"). If each kitchen buys its own ingredients from different suppliers on different days, the same dish tastes different in each place, and the prep kitchen cannot know what the others expect. So the group keeps **one shared order book**: every kitchen lists what it needs, one buyer makes **one order** that satisfies everyone, and every kitchen gets the same delivery.

Separately, every kitchen has things that are **never served to customers**: thermometers, cleaning kits, the training manual. They are needed in the kitchen, but they must not go out with the food.

A **uv workspace** is the shared order book: several Python packages in one repo, one lockfile, one environment. **Dependency groups** are the "not served to customers" lists: test, lint and docs tools that you need while developing, but that are not part of the package you ship.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Are the services released together or separately? | A workspace shares one lock; separately versioned products may want separate projects |
| Does any package need a different version of a shared library? | One lock means one version of each dependency for every member |
| Do members need different Python versions? | The workspace \`requires-python\` is the intersection of all members |
| Which tools are CI-only and which are needed locally? | Decides which groups are default and which are opt-in |
| How do we build Docker images per service? | Drives the use of \`--package\`, \`--no-dev\` and \`--frozen\` in CI |

## 3. A Workspace in One Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 700 360" role="img" aria-label="Repository root shop with pyproject.toml, one uv.lock and one .venv. Three members under packages: shop-core, shop-api and shop-testkit. shop-api and shop-testkit depend on shop-core.">
  <defs>
    <marker id="ws1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="20" width="660" height="100" rx="12"/>
  <text class="d-text" x="350" y="48" text-anchor="middle">shop/  workspace root</text>
  <rect class="d-box" x="50" y="64" width="180" height="40" rx="8"/>
  <text class="d-text" x="140" y="89" text-anchor="middle">pyproject.toml</text>
  <rect class="d-box" x="260" y="64" width="180" height="40" rx="8"/>
  <text class="d-text" x="350" y="89" text-anchor="middle">uv.lock (one)</text>
  <rect class="d-box" x="470" y="64" width="180" height="40" rx="8"/>
  <text class="d-text" x="560" y="89" text-anchor="middle">.venv (one)</text>
  <rect class="d-box" x="20" y="200" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="228" text-anchor="middle">shop-api</text>
  <text class="d-sub" x="120" y="252" text-anchor="middle">packages/api</text>
  <rect class="d-box-muted" x="250" y="280" width="200" height="70" rx="10"/>
  <text class="d-text" x="350" y="308" text-anchor="middle">shop-core</text>
  <text class="d-sub" x="350" y="332" text-anchor="middle">packages/core</text>
  <rect class="d-box" x="480" y="200" width="200" height="70" rx="10"/>
  <text class="d-text" x="580" y="228" text-anchor="middle">shop-testkit</text>
  <text class="d-sub" x="580" y="252" text-anchor="middle">packages/testkit</text>
  <path class="d-edge-dashed" d="M 200 120 L 140 196" marker-end="url(#ws1-arrow)"/>
  <path class="d-edge-dashed" d="M 500 120 L 560 196" marker-end="url(#ws1-arrow)"/>
  <path class="d-edge-accent" d="M 220 260 L 270 300" marker-end="url(#ws1-arrow)"/>
  <path class="d-edge-accent" d="M 480 260 L 430 300" marker-end="url(#ws1-arrow)"/>
</svg>

Dashed arrows: the root lists the members. Solid arrows: \`shop-api\` and \`shop-testkit\` depend on \`shop-core\` through \`workspace = true\` sources. Everything resolves into the single \`uv.lock\` and installs into the single \`.venv\`.

📌 **Interview term: Workspace** — a set of Python packages in one repository that uv manages together: one root \`pyproject.toml\` with \`[tool.uv.workspace]\`, one shared \`uv.lock\`, one shared \`.venv\`. Workspaces arrived with uv 0.3.0 in August 2024, where Astral describes every package keeping its own \`pyproject.toml\` while "the workspace shares a single lockfile" ([Astral: uv unified Python packaging](https://astral.sh/blog/uv-unified-python-packaging)).

📌 **Interview term: Workspace member** — one package in the workspace, with its own \`pyproject.toml\` and \`[project]\` table. The root is a member too.

## 4. The Configuration

This is the real layout used for every uv session on this page.

**Root \`shop/pyproject.toml\`:**

~~~toml
[project]
name = "shop"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["shop-api"]

[tool.uv.sources]
shop-api = { workspace = true }
shop-testkit = { workspace = true }

[tool.uv.workspace]
members = ["packages/*"]

[dependency-groups]
test = ["shop-testkit", "iniconfig>=2"]
lint = ["ruff>=0.6"]
dev = [{ include-group = "test" }, { include-group = "lint" }]
~~~

**Member \`packages/api/pyproject.toml\`** (\`core\` and \`testkit\` look the same, \`core\` has no dependencies):

~~~toml
[project]
name = "shop-api"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["shop-core"]

[build-system]
requires = ["uv_build>=0.11,<0.12"]
build-backend = "uv_build"

[tool.uv.sources]
shop-core = { workspace = true }
~~~

Three things to notice:

1. **\`members\` takes globs** (\`packages/*\`); \`exclude = [...]\` removes folders that match but should not be members.
2. **A member depends on another member by its normal name** (\`"shop-core"\`), exactly as if it came from PyPI. The \`[tool.uv.sources]\` entry \`{ workspace = true }\` tells uv "take it from the workspace, not from an index". That keeps \`[project].dependencies\` standard, so the package still builds and publishes normally.
3. **The root has no \`[build-system]\`**, so uv treats it as a **virtual** project: it is not installed itself, only its dependencies are. The lock records it as \`source = { virtual = "." }\` while members are \`source = { editable = "packages/api" }\`.

📌 **Interview term: Workspace source** — \`name = { workspace = true }\` in \`[tool.uv.sources]\`: "resolve this dependency to the workspace member of that name, installed as editable".

📌 **Interview term: Editable install** — the package is installed as a link to its source folder, so edits take effect without reinstalling. Workspace members are always installed this way.

**What happens if you forget the source entry?** We removed \`[tool.uv.sources]\` from \`packages/api\` and ran \`uv lock\`:

~~~text
error: Failed to generate package metadata for \`shop-api==0.1.0 @ editable+packages/api\`
  Caused by: Failed to parse entry: \`shop-core\`
  Caused by: \`shop-core\` is included as a workspace member, but is missing an entry in \`tool.uv.sources\` (e.g., \`shop-core = { workspace = true }\`)
~~~

uv refuses rather than guessing, because \`shop-core\` could also exist on PyPI.

## 5. One Lock, One Environment, Many Packages

\`uv lock\` at the root resolved everything at once: \`Resolved 6 packages\` (four members plus \`iniconfig\` and \`ruff\`). The top of the real \`uv.lock\` lists the members:

~~~toml
version = 1
revision = 3
requires-python = ">=3.11"

[manifest]
members = [
    "shop",
    "shop-api",
    "shop-core",
    "shop-testkit",
]
~~~

Consequences you should state in an interview:

- **Every member gets the same version of every dependency.** If \`shop-api\` and \`shop-worker\` both use \`pydantic\`, there is exactly one \`pydantic\` version in the lock. That is the point (no "works in the API, breaks in the worker"), and also the main limitation.
- **\`requires-python\` is the intersection.** We raised \`shop-core\` to \`>=3.12\`: with python3.12 the lock was rewritten with \`requires-python = ">=3.12"\`, and asking for 3.11 failed with "incompatible with the project's Python requirement: \`>=3.12\` (from workspace member \`shop-core\`'s \`project.requires-python\`)".
- **Commands find the root from anywhere.** Running \`uv tree\` inside \`packages/core\` used the root \`uv.lock\`.
- **Targeting a member.** \`uv sync --package shop-core\` and \`uv run --package shop-api ...\` work on one member and its dependencies; \`--all-packages\` installs every member. The dry runs in the Verified section show exactly which packages each selection installs.

📌 **Interview term: \`--package\`** — the uv flag that makes \`run\`, \`sync\`, \`lock\`-related commands (\`tree\`, \`export\`) operate on one named workspace member instead of the root project.

### Workspace vs path dependencies vs separate projects

| | Workspace member | Path dependency (\`{ path = "../core" }\`) | Separate project |
| :--- | :--- | :--- | :--- |
| Lockfile | one shared \`uv.lock\` | each project has its own | each has its own |
| Versions of shared deps | always identical | can differ | can differ |
| \`requires-python\` | intersection of all | per project | per project |
| Good for | one product, several packages | a project that uses a local library | independent services |

## 6. Dependency Groups

A project's \`[project].dependencies\` are what users of the package need. Developers also need test runners, linters, type checkers and docs tools. Those should **not** be installed when someone runs \`pip install shop-api\`. Historically people abused extras (\`pip install shop-api[dev]\`) or kept \`requirements-dev.txt\` files. PEP 735 standardised a better place: the top-level **\`[dependency-groups]\`** table. The PEP was accepted in October 2024 and uv added support in 0.4.27 the same month; pip gained \`pip install --group\` in 25.1 ([pydevtools: What is PEP 735?](https://pydevtools.com/handbook/explanation/what-is-pep-735/); [pip 25.1 release](https://discuss.python.org/t/announcement-pip-25-1-release/89702)).

<svg class="iq-diagram" width="100%" viewBox="0 0 700 270" role="img" aria-label="The dev group includes the test group and the lint group. test lists shop-testkit and iniconfig. lint lists ruff.">
  <defs>
    <marker id="ws2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="250" y="20" width="200" height="60" rx="10"/>
  <text class="d-text" x="350" y="46" text-anchor="middle">dev</text>
  <text class="d-sub" x="350" y="68" text-anchor="middle">installed by default</text>
  <rect class="d-box" x="60" y="170" width="240" height="70" rx="10"/>
  <text class="d-text" x="180" y="198" text-anchor="middle">test</text>
  <text class="d-sub" x="180" y="222" text-anchor="middle">shop-testkit, iniconfig</text>
  <rect class="d-box" x="400" y="170" width="240" height="70" rx="10"/>
  <text class="d-text" x="520" y="198" text-anchor="middle">lint</text>
  <text class="d-sub" x="520" y="222" text-anchor="middle">ruff</text>
  <path class="d-edge" d="M 300 80 L 200 166" marker-end="url(#ws2-arrow)"/>
  <path class="d-edge" d="M 400 80 L 500 166" marker-end="url(#ws2-arrow)"/>
</svg>

The arrows are \`{ include-group = "..." }\` entries: \`dev\` contains everything in \`test\` and in \`lint\`.

📌 **Interview term: Dependency group (PEP 735)** — a named list of requirements in the top-level \`[dependency-groups]\` table of \`pyproject.toml\`, meant for development needs. Groups are not part of the built package metadata, so users who install the package never get them.

📌 **Interview term: \`include-group\`** — an entry \`{ include-group = "name" }\` inside a group that pulls in all requirements of another group; uv rejects cycles.

Rules we checked with uv:

- **Names are normalised** like package names: a group written \`Test_Tools\` is stored as \`test-tools\` in the lock and selected with \`--only-group test-tools\`.
- **Cycles are errors:** making \`lint\` include \`ci\` while \`ci\` includes \`lint\` gave \`\`Detected a cycle in \`dependency-groups\`: \`ci\` -> \`lint\` -> \`ci\` \`\`.
- **Unknown names are errors:** \`--only-group nope\` gave \`\`Group \`nope\` is not defined in the project's \`dependency-groups\` table\`\`.
- **\`uv add --dev ruff\`** writes into \`[dependency-groups].dev\`, and **\`uv add --group docs ...\`** creates or extends a \`docs\` group.

### Groups vs extras

| | \`[dependency-groups]\` | \`[project.optional-dependencies]\` (extras) |
| :--- | :--- | :--- |
| Who it is for | the project's developers | users of the package |
| In published metadata | no | yes (\`Requires-Dist\` with \`extra ==\` markers) |
| How users ask for it | they cannot | \`pip install shop-api[postgres]\` |
| Composable | \`include-group\` | an extra can name the package with another extra |
| Typical content | pytest, ruff, mypy, docs tools | optional features: a database driver, a CLI |

**Proof from a real build.** We gave \`shop-api\` a \`bench\` dependency group and a \`postgres\` extra (\`psycopg>=3\`), built it with \`uv build --package shop-api --wheel\` (uv's built-in \`uv_build\` backend, offline), and read the wheel's \`METADATA\`:

~~~text
Metadata-Version: 2.3
Name: shop-api
Version: 0.1.0
Requires-Dist: shop-core
Requires-Dist: psycopg>=3 ; extra == 'postgres'
Requires-Python: >=3.11
Provides-Extra: postgres
~~~

The extra is published; the \`bench\` group is nowhere; and the workspace source left only a plain \`Requires-Dist: shop-core\`, exactly as if \`shop-core\` came from PyPI.

📌 **Interview term: Extra (optional dependency)** — a named optional feature of a published package, in \`[project.optional-dependencies]\`, that end users install with \`package[extra]\`.

## 7. Choosing Groups with uv Flags

| Command | What it installs (from the real dry runs) |
| :--- | :--- |
| \`uv sync\` | project deps + the \`dev\` group: 5 packages |
| \`uv sync --no-dev\` | project deps only: \`shop-api\`, \`shop-core\` |
| \`uv sync --only-group lint\` | only \`ruff\`, not even the project |
| \`uv sync --no-dev --group lint\` | project deps + \`ruff\` |
| \`uv sync --all-groups\` | project deps + every group |
| \`uv sync --package shop-core\` | that member and its deps, nothing else |

\`--group X\` **adds** to the defaults; \`--only-group X\` **replaces** everything, which is perfect for a CI lint job that should not install the application. The default set is \`["dev"]\`; \`[tool.uv] default-groups = ["lint"]\` changes it (in our test, \`uv sync --dry-run\` then planned only \`ruff\`), and \`--no-default-groups\` turns defaults off for one command.

📌 **Interview term: Default groups** — the groups uv installs without being asked: \`dev\` unless \`[tool.uv] default-groups\` says otherwise.

### Groups that cannot live together: \`conflicts\`

Because the workspace has **one** lock, uv by default requires all groups to be installable together. Two groups pinning \`iniconfig==1.1.1\` and \`iniconfig==2.0.0\` made \`uv lock\` fail:

~~~text
  × No solution found when resolving dependencies:
  ╰─▶ Because demo:old depends on iniconfig==1.1.1 and demo:new depends
      on iniconfig==2.0.0, we can conclude that demo:new and demo:old are
      incompatible.
      And because your project requires demo:new and demo:old, we can conclude
      that your project's requirements are unsatisfiable.
~~~

Declaring them as alternatives fixed the lock:

~~~toml
[tool.uv]
conflicts = [[{ group = "old" }, { group = "new" }]]
~~~

\`uv lock\` then printed \`Resolved 3 packages\`, \`uv sync --group old\` planned \`iniconfig==1.1.1\`, and asking for both at once was refused: \`\`Groups \`new\` and \`old\` are incompatible with the conflicts: {\`demo:new\`, \`demo:old\`}\`\`.

## 8. Day-to-Day Commands in a Workspace

~~~bash
uv sync                                  # root + dev group, editable members
uv run --package shop-api pytest         # run inside the shared venv, scoped to shop-api
uv sync --frozen --no-dev --package shop-api   # Docker image for the API: no tests, no lint
uv export --no-hashes --only-group test  # requirements.txt for a tool that needs one
uv lock --check                          # CI: fail if someone edited pyproject without locking
uv workspace list                        # list the members
~~~

## 9. Verified: Running the Code

**The uv sessions.** These ran in the \`shop/\` workspace above after \`uv lock\`. We used \`uv sync --dry-run\` so nothing was installed; it prints the plan:

~~~text
$ uv workspace list
shop
shop-api
shop-core
shop-testkit

$ uv tree
Using CPython 3.11.17 interpreter at: /usr/bin/python3.11
Resolved 6 packages in 1ms
shop-testkit v0.1.0
└── shop-core v0.1.0
shop-core v0.1.0
shop-api v0.1.0
└── shop-core v0.1.0
shop v0.1.0
├── shop-api v0.1.0 (*)
├── iniconfig v2.3.1 (group: dev)
├── ruff v0.17.1 (group: dev)
└── shop-testkit v0.1.0 (group: dev) (*)
(*) Package tree already displayed

$ uv sync --dry-run
Using CPython 3.11.17 interpreter at: /usr/bin/python3.11
Would create project environment at: .venv
Resolved 6 packages in 2ms
Found up-to-date lockfile at: uv.lock
Would download 3 packages
Would install 5 packages
 + iniconfig==2.3.1
 + ruff==0.17.1
 + shop-api @ file://.../shop/packages/api
 + shop-core @ file://.../shop/packages/core
 + shop-testkit @ file://.../shop/packages/testkit

$ uv sync --dry-run --no-dev
Using CPython 3.11.17 interpreter at: /usr/bin/python3.11
Would create project environment at: .venv
Resolved 6 packages in 3ms
Found up-to-date lockfile at: uv.lock
Would download 2 packages
Would install 2 packages
 + shop-api @ file://.../shop/packages/api
 + shop-core @ file://.../shop/packages/core

$ uv sync --dry-run --only-group lint
Using CPython 3.11.17 interpreter at: /usr/bin/python3.11
Would create project environment at: .venv
Resolved 6 packages in 8ms
Found up-to-date lockfile at: uv.lock
Would install 1 package
 + ruff==0.17.1

$ uv sync --dry-run --package shop-core
Using CPython 3.11.17 interpreter at: /usr/bin/python3.11
Would create project environment at: .venv
Resolved 6 packages in 1ms
Found up-to-date lockfile at: uv.lock
Would download 1 package
Would install 1 package
 + shop-core @ file://.../shop/packages/core

$ uv export --no-hashes --only-group test
Using CPython 3.11.17 interpreter at: /usr/bin/python3.11
Resolved 6 packages in 1ms
# This file was autogenerated by uv via the following command:
#    uv export --no-hashes --only-group test
-e ./packages/core
    # via shop-testkit
-e ./packages/testkit
iniconfig==2.3.1
~~~

\`uv sync --dry-run --no-dev --group lint\` planned \`ruff\`, \`shop-api\` and \`shop-core\`, and \`--all-groups\` planned all 5. The "Would download" counts differ from the install counts because some files were already in uv's cache from earlier commands.

**The in-page examples.** Both were saved as \`main.py\` and run with \`python3.11 main.py\`, and again in this page (Pyodide 0.25.1); the output was identical. They are **models** of what uv does, written in plain Python with \`tomllib\` and \`glob\`, not uv's own code; their results match the uv runs above.

**Example 1 — model of workspace discovery** builds a four-member workspace with an excluded folder and a member that forgot its source entry. It prints:

~~~text
members: ['shop', 'shop-api', 'shop-core', 'shop-worker']
error: shop-worker needs shop-core = { workspace = true } in tool.uv.sources
build order: ['shop-core', 'shop-api', 'shop', 'shop-worker']
workspace requires-python: >=3.12
~~~

**Example 2 — model of dependency groups and sync flags** prints:

~~~text
['dev', 'docs', 'lint', 'test-tools']
['shop-testkit', 'iniconfig>=2', 'ruff>=0.6']
['shop-testkit', 'iniconfig>=2']
uv sync                   ['shop-api', 'shop-testkit', 'iniconfig>=2', 'ruff>=0.6']
uv sync --no-dev          ['shop-api']
uv sync --only-group lint ['ruff>=0.6']
uv sync --group docs      ['shop-api', 'shop-testkit', 'iniconfig>=2', 'ruff>=0.6', 'mkdocs>=1.6']
default-groups = [lint]   ['shop-api', 'ruff>=0.6']
published Requires-Dist: ['shop-api']
error: cycle: dev -> lint -> dev
~~~

**What the output shows:** member discovery follows the \`members\` globs minus \`exclude\`; a member that depends on another member without \`workspace = true\` is flagged (uv makes this a hard error); dependencies come before their dependants; and the workspace Python floor is the highest lower bound of all members. For groups, \`include-group\` expands recursively, \`Test_Tools\` and \`TEST_TOOLS\` both mean \`test-tools\`, the flag combinations give the same selections as the uv dry runs, groups are absent from the published dependency list, and a cycle is rejected.

## 10. Edge Cases

- **Members with the same dependency at incompatible versions** cannot share a workspace. Split them into separate projects, or use path dependencies with separate locks.
- **A member can be a library published to PyPI.** \`{ workspace = true }\` only affects development; the built wheel says plain \`Requires-Dist: shop-core\` (Section 6), so publish members in dependency order.
- **Groups in members.** Each member can have its own \`[dependency-groups]\`. We added \`bench = ["iniconfig>=2"]\` to \`shop-api\`, and \`uv sync --dry-run --package shop-api --group bench --no-dev\` planned \`iniconfig\`, \`shop-api\` and \`shop-core\`.
- **\`uv sync\` is exact.** Packages in \`.venv\` that the selected lock entries do not include are removed, which is what you want in CI and surprising if you \`pip install\`ed something by hand.
- **Legacy \`[tool.uv] dev-dependencies\`** is the older uv-only spelling of the \`dev\` group. uv 0.11.32 still reads it but warns: "The \`tool.uv.dev-dependencies\` field (used in \`pyproject.toml\`) is deprecated and will be removed in a future release; use \`dependency-groups.dev\` instead".

## Common Pitfalls

- **Forgetting \`{ workspace = true }\`** in the dependent member's \`[tool.uv.sources]\`. uv stops with "is included as a workspace member, but is missing an entry in \`tool.uv.sources\`".
- **Expecting independent versions per member.** One lock means one version of each package; that is a feature until two members truly disagree.
- **Using extras for dev tools.** Extras are published and users can install them; dev tools belong in \`[dependency-groups]\`.
- **Shipping the dev group in production images.** Use \`--no-dev\` (or \`--only-group\` for tool-only jobs) and \`--frozen\` / \`--locked\` in Docker and CI.
- **Running commands from a member folder and expecting a separate venv.** The workspace has one \`.venv\` at the root.
- **Two groups with conflicting pins** without declaring \`[tool.uv] conflicts\`; the lock fails.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Workspace:</strong> <span style="color:#f0e2c8;">A uv workspace is a root <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyproject.toml</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[tool.uv.workspace]</code> <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">members</code> globs (and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exclude</code>); each member has its own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyproject.toml</code>, but there is one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code> and one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.venv</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Linking members:</strong> <span style="color:#f0e2c8;">A member lists another by name in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project].dependencies</code> and adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">name = { workspace = true }</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[tool.uv.sources]</code>; members install as editable, and uv errors if the source is missing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Scope and limits:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--package</code> targets one member, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--all-packages</code> all of them; one lock means one version of every dependency and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">requires-python</code> is the intersection of all members.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Groups:</strong> <span style="color:#f0e2c8;">PEP 735 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[dependency-groups]</code> hold dev-only requirements that are not published, unlike extras; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">include-group</code> composes them, names are normalised, cycles are rejected.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Selection:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dev</code> is installed by default; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--no-dev</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--group</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--only-group</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--all-groups</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default-groups</code> change that, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[tool.uv] conflicts</code> allows mutually exclusive groups.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you not use a workspace?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When packages need different versions of the same dependency, different Python versions, or fully independent release cycles. Then use separate projects, possibly with path dependencies, each with its own lock.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a dependency group and an extra?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An extra is part of the published package metadata and users install it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pkg[extra]</code>. A dependency group lives only in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyproject.toml</code> for the developers and never reaches users who install the package.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you build a slim Docker image for one service in a workspace?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Copy the lock and the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyproject.toml</code> files, run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync --frozen --no-dev --package shop-api</code> (optionally <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--no-install-project</code> first for layer caching), then copy the source.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">uv</code> insist on <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">workspace = true</code> instead of just finding the member?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same name could exist on PyPI. The explicit source makes the choice deliberate and keeps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project].dependencies</code> standard, so the package still builds and publishes normally.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you let CI run only the linter without installing the app?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put the linter in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lint</code> group and run <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync --only-group lint</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv run --only-group lint ruff check .</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--only-group</code> skips the project dependencies entirely.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Workspace** | several packages in one repo with one \`uv.lock\` and one \`.venv\` |
| **Workspace member** | one package of the workspace, with its own \`pyproject.toml\` |
| **Workspace source** | \`name = { workspace = true }\`: resolve this dependency to the member |
| **Editable install** | installed as a link to the source folder |
| **\`--package\`** | run a uv command for one workspace member |
| **Dependency group (PEP 735)** | named dev-only requirement list in \`[dependency-groups]\` |
| **\`include-group\`** | a group entry that pulls in another group |
| **Extra (optional dependency)** | published optional feature installed with \`pkg[extra]\` |
| **Default groups** | groups installed without asking: \`dev\` unless configured |

---
**Conclusion:** A uv workspace turns a multi-package repo into one resolvable unit: members listed by glob in the root \`pyproject.toml\`, linked to each other with \`{ workspace = true }\` sources, resolved into one \`uv.lock\` and installed as editable packages in one \`.venv\`, so every package always sees the same versions and the same Python range. Dependency groups give development tools a standard home that never leaks into published metadata: compose them with \`include-group\`, rely on \`dev\` being the default, and pick exactly what each job needs with \`--no-dev\`, \`--group\` and \`--only-group\`. Know the limit (one lock, one version of everything) and you can explain both how to set it up and when not to.
`,
    examples: [
      { label: `Model of workspace discovery: members, sources, order, Python range`, code: `# A small model of what uv does when it meets a workspace:
# find the members, check their sources, order them, intersect requires-python.
import glob
import os
import tempfile
import tomllib

root = tempfile.mkdtemp()

def write(rel, text):
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)

write("pyproject.toml", '''
[project]
name = "shop"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["shop-api"]

[tool.uv.sources]
shop-api = { workspace = true }

[tool.uv.workspace]
members = ["packages/*"]
exclude = ["packages/legacy"]
''')
write("packages/core/pyproject.toml", '[project]\\nname = "shop-core"\\nversion = "0.1.0"\\nrequires-python = ">=3.10"\\ndependencies = []\\n')
write("packages/api/pyproject.toml", '[project]\\nname = "shop-api"\\nversion = "0.1.0"\\nrequires-python = ">=3.11"\\ndependencies = ["shop-core", "fastapi>=0.110"]\\n\\n[tool.uv.sources]\\nshop-core = { workspace = true }\\n')
write("packages/worker/pyproject.toml", '[project]\\nname = "shop-worker"\\nversion = "0.1.0"\\nrequires-python = ">=3.12"\\ndependencies = ["shop-core"]\\n')
write("packages/legacy/pyproject.toml", '[project]\\nname = "shop-legacy"\\nversion = "0.0.1"\\n')

def load(rel_dir):
    with open(os.path.join(root, rel_dir, "pyproject.toml"), "rb") as f:
        return tomllib.load(f)

ws = load(".")["tool"]["uv"]["workspace"]
dirs = ["."]
for pattern in ws["members"]:
    for d in sorted(glob.glob(os.path.join(root, pattern))):
        rel = os.path.relpath(d, root).replace(os.sep, "/")
        if rel not in ws.get("exclude", []):
            dirs.append(rel)
members = {load(d)["project"]["name"]: d for d in dirs}
print("members:", sorted(members))

def bare(req):
    for stop in "<>=!~[; ":
        req = req.split(stop)[0]
    return req

graph = {}
for name, d in members.items():
    conf = load(d)
    sources = conf.get("tool", {}).get("uv", {}).get("sources", {})
    internal = []
    for req in conf["project"].get("dependencies", []):
        dep = bare(req)
        if dep in members:
            internal.append(dep)
            if not sources.get(dep, {}).get("workspace"):
                print(f"error: {name} needs {dep} = {{ workspace = true }} in tool.uv.sources")
    graph[name] = internal

def build_order(graph):
    done, order = set(), []
    def visit(n):
        if n not in done:
            done.add(n)
            for dep in graph[n]:
                visit(dep)
            order.append(n)
    for n in sorted(graph):
        visit(n)
    return order

print("build order:", build_order(graph))

# One lockfile for everyone means one Python range for everyone: the intersection.
lower = max(tuple(int(x) for x in load(d)["project"].get("requires-python", ">=3.8")[2:].split("."))
            for d in members.values())
print("workspace requires-python: >=" + ".".join(map(str, lower)))` },
      { label: `Model of dependency groups: include-group, names, cycles, sync flags`, code: `# PEP 735 dependency groups: expand include-group, normalise names, reject cycles,
# then pick groups the way uv sync flags do (a model, checked against uv dry runs).
import re
import tomllib

PYPROJECT = '''
[project]
name = "shop"
version = "0.1.0"
dependencies = ["shop-api"]

[dependency-groups]
Test_Tools = ["shop-testkit", "iniconfig>=2"]
lint = ["ruff>=0.6"]
dev = [{ include-group = "test-tools" }, { include-group = "lint" }]
docs = ["mkdocs>=1.6"]
'''

def normalize(name):
    # Same rule as package names: runs of -, _ and . become one "-", lower case.
    return re.sub(r"[-_.]+", "-", name).lower()

def expand(groups, name, seen=()):
    name = normalize(name)
    if name in seen:
        raise ValueError("cycle: " + " -> ".join(seen + (name,)))
    out = []
    for item in groups[name]:
        if isinstance(item, str):
            out.append(item)
        else:
            out.extend(expand(groups, item["include-group"], seen + (name,)))
    return out

conf = tomllib.loads(PYPROJECT)
groups = {normalize(k): v for k, v in conf["dependency-groups"].items()}
print(sorted(groups))
print(expand(groups, "dev"))
print(expand(groups, "TEST_TOOLS"))

def select(project_deps=True, default_groups=("dev",), group=(), only_group=(),
           no_dev=False, all_groups=False):
    if only_group:
        chosen, project_deps = list(only_group), False
    else:
        chosen = list(groups) if all_groups else [g for g in default_groups if not (no_dev and g == "dev")]
        chosen += [g for g in group if g not in chosen]
    reqs = list(conf["project"]["dependencies"]) if project_deps else []
    for g in chosen:
        reqs += [r for r in expand(groups, g) if r not in reqs]
    return reqs

print("uv sync                  ", select())
print("uv sync --no-dev         ", select(no_dev=True))
print("uv sync --only-group lint", select(only_group=["lint"]))
print("uv sync --group docs     ", select(group=["docs"]))
print("default-groups = [lint]  ", select(default_groups=["lint"]))

# Groups are NOT in the built wheel metadata; extras are.
print("published Requires-Dist:", conf["project"]["dependencies"])

groups["lint"] = [{"include-group": "dev"}]
try:
    expand(groups, "dev")
except ValueError as e:
    print("error:", e)` },
    ],
  },
];

export default augments;
