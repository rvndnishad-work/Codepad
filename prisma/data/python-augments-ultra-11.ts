/**
 * PYTHON ULTRA — batch 11: Packaging and tooling. Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts (examples marked runnable: false on the
 * interpreter named in their python field); quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: `How do pyproject.toml, tomllib, and uv/pyproject workflows fit together?`,
    difficulty: `easy`,
    seoDescription: `pyproject.toml explained: [project], [build-system], dependency groups and [tool] tables, read with tomllib, and how uv add, lock, sync and run use them.`,
    description: `**Question presented to candidate:**
"Most new Python projects start with a single pyproject.toml file and a tool like uv. Explain what goes in that file, who reads which part of it, where tomllib fits in, and what actually happens when you run uv add, uv sync and uv run."

**What a strong answer should cover:**
- \`pyproject.toml\` is one TOML file with standard tables: \`[build-system]\` (PEP 518: how to build the package), \`[project]\` (PEP 621: name, version, \`requires-python\`, dependencies), \`[dependency-groups]\` (PEP 735: dev-only groups such as \`test\` and \`lint\`) and a free namespace \`[tool.NAME]\` for each tool's own settings.
- \`tomllib\` (standard library since Python 3.11, PEP 680) is the read-only parser: \`tomllib.load()\` needs a file opened in binary mode, \`tomllib.loads()\` takes a string, and there is no \`dump()\`.
- The uv loop: \`uv add\` edits \`pyproject.toml\`, resolves and writes the exact versions to \`uv.lock\`, and installs into \`.venv\`; \`uv sync\` makes \`.venv\` match the lock; \`uv run\` syncs and then runs the command inside that environment.
- Ranges vs pins: \`pyproject.toml\` declares the ranges you accept, \`uv.lock\` records the exact versions and hashes the resolver chose; commit both, never commit \`.venv\`.
- The build side: a frontend (\`uv build\`, \`pip\`) reads \`[build-system]\`, installs the backend it names (hatchling, setuptools, \`uv_build\`) and calls it to make an sdist and a wheel.
- A bonus detail: PEP 723 inline script metadata (\`# /// script\`) puts the same TOML inside a single script, and \`uv run script.py\` honours it.

**Code / implementation expected:** Optional — reading a pyproject with \`tomllib\` and sketching the four tables is a strong start; no build needed.`,
    answer: `**Target Audience:** Beginners who have run \`pip install\` but never set up a project from scratch; also experienced developers who want the precise names of each part.
**Difficulty:** Easy
**Python version:** The \`tomllib\` examples were run on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, which is CPython 3.11.3). The uv commands were run with uv 0.11.32 against CPython 3.12.3.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Outputs in the **Verified** section, and the uv files shown, were copied from real runs.

## 1. Why This Even Matters — A Story First

Imagine a restaurant kitchen with a single clipboard by the door. The top sheet tells the delivery driver how to load the van. The second sheet is the menu: the dish names and the ingredients each one needs. The third sheet is staff-only: what the cooks need for practice and cleaning, which never goes to customers. Below that, every station (grill, pastry, dish pit) has its own little section with its own notes, and nobody else touches it.

Then there is a second document, the stock sheet, filled in after shopping: not "some flour" but "Brand X flour, 2 kg bag, batch 4471". Anyone can restock the kitchen exactly by reading it.

\`pyproject.toml\` is the clipboard, its tables are the sheets, \`uv.lock\` is the stock sheet, and \`.venv\` is the stocked kitchen. \`tomllib\` is how anyone written in Python reads the clipboard. Once you see which reader owns which sheet, every packaging command stops being magic.

## 2. The File: TOML Tables in pyproject.toml

**TOML** is a small configuration format: \`[section]\` headers start a table, \`key = value\` lines fill it, and values can be strings, numbers, booleans, dates, arrays \`[...]\` and inline tables \`{...}\`. A parsed TOML file is just a nested \`dict\`.

📌 **Interview term: TOML** — "Tom's Obvious, Minimal Language", a config format designed to map unambiguously onto a dictionary. Its tables become nested dicts and its arrays become lists.

📌 **Interview term: pyproject.toml** — the standard configuration file at the root of a Python project. It started (PEP 518) as the place to declare build requirements and grew into the single home for metadata, dev dependencies and tool settings ([pip reference](https://pip.pypa.io/en/stable/reference/build-system/pyproject-toml/)).

A realistic file, the one Example 1 parses:

~~~toml
[build-system]
requires = ["hatchling>=1.24"]
build-backend = "hatchling.build"

[project]
name = "invoice-api"
version = "1.4.0"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27", "pydantic>=2.6,<3"]

[project.optional-dependencies]
pdf = ["weasyprint>=62"]

[project.scripts]
invoice = "invoice_api.cli:main"

[dependency-groups]
test = ["pytest>=8"]
dev = [{ include-group = "test" }, "ruff"]

[tool.ruff]
line-length = 100

[tool.uv]
default-groups = ["dev"]
~~~

The four kinds of table, and who reads each:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="One pyproject.toml file with four tables, each read by a different consumer">
  <defs>
    <marker id="py11q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="40" y="20" width="250" height="290" rx="12"/>
  <text class="d-text d-accent" x="165" y="50" text-anchor="middle">pyproject.toml</text>
  <rect class="d-box" x="62" y="70" width="206" height="44" rx="8"/>
  <text class="d-text" x="165" y="97" text-anchor="middle">[build-system]</text>
  <rect class="d-box" x="62" y="134" width="206" height="44" rx="8"/>
  <text class="d-text" x="165" y="161" text-anchor="middle">[project]</text>
  <rect class="d-box" x="62" y="198" width="206" height="44" rx="8"/>
  <text class="d-text" x="165" y="225" text-anchor="middle">[dependency-groups]</text>
  <rect class="d-box-muted" x="62" y="256" width="206" height="44" rx="8"/>
  <text class="d-text" x="165" y="283" text-anchor="middle">[tool.ruff] [tool.uv]</text>
  <path class="d-edge" d="M 268 92 L 450 72" marker-end="url(#py11q1-arrow)"/>
  <path class="d-edge" d="M 268 156 L 450 146" marker-end="url(#py11q1-arrow)"/>
  <path class="d-edge" d="M 268 220 L 450 220" marker-end="url(#py11q1-arrow)"/>
  <path class="d-edge-dashed" d="M 268 278 L 450 290" marker-end="url(#py11q1-arrow)"/>
  <rect class="d-box" x="456" y="44" width="270" height="54" rx="10"/>
  <text class="d-text" x="591" y="67" text-anchor="middle">Build frontend</text>
  <text class="d-sub" x="591" y="88" text-anchor="middle">uv build, pip: which backend</text>
  <rect class="d-box" x="456" y="118" width="270" height="54" rx="10"/>
  <text class="d-text" x="591" y="141" text-anchor="middle">Installers and resolvers</text>
  <text class="d-sub" x="591" y="162" text-anchor="middle">name, version, dependencies</text>
  <rect class="d-box" x="456" y="192" width="270" height="54" rx="10"/>
  <text class="d-text" x="591" y="215" text-anchor="middle">Project manager</text>
  <text class="d-sub" x="591" y="236" text-anchor="middle">uv sync: dev and test groups</text>
  <rect class="d-box-muted" x="456" y="264" width="270" height="54" rx="10"/>
  <text class="d-text" x="591" y="287" text-anchor="middle">Each named tool</text>
  <text class="d-sub" x="591" y="308" text-anchor="middle">ruff, pytest, mypy, uv</text>
</svg>

Each arrow is a different program reading the same file; the dashed one is the free-for-all \`[tool]\` namespace, where each tool only reads its own sub-table.

### \`[build-system]\` — how to turn the source into a package

📌 **Interview term: [build-system] table** — defined by PEP 518. \`requires\` lists what must be installed to run the build, and \`build-backend\` names the Python object that does it. The interface between the two sides is PEP 517.

📌 **Interview term: Build frontend / build backend** — the frontend is the command you run (\`uv build\`, \`pip install .\`, \`python -m build\`); it creates an isolated environment, installs \`requires\`, and calls the backend (hatchling, setuptools, flit-core, \`uv_build\`) to produce an **sdist** (source archive) and a **wheel** (ready-to-install archive). An application that is never published can omit this table entirely; \`uv init --app\` does exactly that, while \`uv init --lib\` writes one (shown in section 4).

### \`[project]\` — the standard metadata

📌 **Interview term: [project] table** — defined by PEP 621: tool-neutral, static metadata, so any tool can read the name, version and dependencies without running a \`setup.py\` ([PEP 621](https://peps.python.org/pep-0621/)). \`name\` is required; \`version\` is too unless declared \`dynamic\`.

- \`dependencies\` is a list of **requirement strings** such as \`"pydantic>=2.6,<3"\`: a package name, optional extras in brackets, and a version range.
- \`requires-python\` says which interpreters the project supports; resolvers use it to pick compatible versions.
- \`optional-dependencies\` are **extras**: published optional feature sets that users install as \`invoice-api[pdf]\`.
- \`scripts\` creates command-line entry points: installing the package creates an \`invoice\` command that calls \`invoice_api.cli:main\`.

📌 **Interview term: Version specifier** — the range part of a requirement string, such as \`>=2.6,<3\`. The pyproject declares what you accept, not what you got.

### \`[dependency-groups]\` — dev-only requirements

📌 **Interview term: Dependency group** — a named list of requirements that is **not** published with the package: test runners, linters, docs tools. Standardised by PEP 735 ([discussion and acceptance](https://discuss.python.org/t/pep-735-dependency-groups-in-pyproject-toml/39233)). A group can pull in another with \`{ include-group = "test" }\`; Example 2 expands one. The full uv story (default groups, workspaces) is in [uv workspaces and dependency groups](/interview-question/how-do-uv-workspaces-and-named-dependency-groups-work).

📌 **Interview term: Extra (optional dependency)** — the published cousin: anyone who installs your package can ask for it. Rule of thumb: if a user of the package might want it, it is an extra; if only contributors need it, it is a group.

### \`[tool.NAME]\` — each tool's private settings

ruff reads \`[tool.ruff]\`, pytest reads \`[tool.pytest.ini_options]\`, mypy reads \`[tool.mypy]\`, uv reads \`[tool.uv]\`. The standard reserves the \`tool\` namespace exactly so tools never clash with the standard tables or each other.

## 3. tomllib: How Python Code Reads the File

📌 **Interview term: tomllib** — the TOML parser in the standard library, added in Python 3.11 by PEP 680 so that build tools no longer need to vendor a third-party parser ([PEP 680](https://peps.python.org/pep-0680/)). It was derived from the \`tomli\` project and is **read-only**.

~~~python
import tomllib

with open("pyproject.toml", "rb") as f:     # binary mode, always
    data = tomllib.load(f)
print(data["project"]["dependencies"])

data2 = tomllib.loads('name = "x"')          # from a str
~~~

Three behaviours to remember, all shown in Example 1:

1. \`tomllib.load()\` takes a **binary** file. Text mode raises \`TypeError: File must be opened in binary mode, e.g. use open('foo.toml', 'rb')\`.
2. Invalid TOML raises \`tomllib.TOMLDecodeError\`, which subclasses \`ValueError\`, with a line and column in the message.
3. There is no \`dump()\` or \`dumps()\`. To write TOML use a third-party library (\`tomli-w\`), and to edit a file while keeping its comments use \`tomlkit\`.

Reading TOML in depth (types, dates, \`parse_float\`) has its own page: [reading TOML with tomllib](/interview-question/how-do-you-read-toml-with-tomllib-in-python-3-11).

## 4. The uv Workflow: From Ranges to an Environment

uv is a project manager: it reads \`pyproject.toml\`, resolves versions, writes a lockfile and builds the virtual environment. Why it is replacing pip and poetry is covered in [what is uv](/interview-question/what-is-uv-and-why-is-it-replacing-pip-poetry-in-2025-26), and why a separate environment matters at all in [why use virtual environments](/interview-question/why-use-virtual-environments).

<svg class="iq-diagram" width="100%" viewBox="0 0 780 250" role="img" aria-label="uv workflow from pyproject.toml through uv lock to uv.lock, uv sync to the venv folder, and uv run">
  <defs>
    <marker id="py11q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="70" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="100" y="100" text-anchor="middle">pyproject.toml</text>
  <text class="d-sub" x="100" y="122" text-anchor="middle">ranges you want</text>
  <path class="d-edge-accent" d="M 180 105 L 280 105" marker-end="url(#py11q1-arrow2)"/>
  <text class="d-sub" x="230" y="90" text-anchor="middle">uv lock</text>
  <rect class="d-box" x="290" y="70" width="160" height="70" rx="10"/>
  <text class="d-text" x="370" y="100" text-anchor="middle">uv.lock</text>
  <text class="d-sub" x="370" y="122" text-anchor="middle">exact pins, hashes</text>
  <path class="d-edge-accent" d="M 450 105 L 550 105" marker-end="url(#py11q1-arrow2)"/>
  <text class="d-sub" x="500" y="90" text-anchor="middle">uv sync</text>
  <rect class="d-box" x="560" y="70" width="190" height="70" rx="10"/>
  <text class="d-text" x="655" y="100" text-anchor="middle">.venv</text>
  <text class="d-sub" x="655" y="122" text-anchor="middle">installed packages</text>
  <rect class="d-box-muted" x="20" y="180" width="160" height="50" rx="10"/>
  <text class="d-text" x="100" y="211" text-anchor="middle">uv add httpx</text>
  <path class="d-edge-dashed" d="M 100 180 L 100 140" marker-end="url(#py11q1-arrow2)"/>
  <rect class="d-box-muted" x="560" y="180" width="190" height="50" rx="10"/>
  <text class="d-text" x="655" y="211" text-anchor="middle">uv run pytest</text>
  <path class="d-edge-dashed" d="M 655 180 L 655 140" marker-end="url(#py11q1-arrow2)"/>
</svg>

The solid arrows are the two steps uv performs; the dashed ones are the commands you type, which trigger those steps for you.

📌 **Interview term: Lockfile** — a file of the exact versions (and file hashes) the resolver chose for every package, direct and indirect. \`uv.lock\` is uv's. It makes installs reproducible: same lock, same packages, on every machine.

What we actually ran (uv 0.11.32, in an empty folder):

~~~bash
uv init --app --vcs none uvdemo --python 3.12
cd uvdemo
uv add "httpx>=0.27"
uv add --dev pytest
~~~

\`uv init --app\` wrote a \`pyproject.toml\` with only a \`[project]\` table. After the two \`uv add\` commands the file read exactly:

~~~toml
[project]
name = "uvdemo"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.12"
dependencies = [
    "httpx>=0.27",
]

[dependency-groups]
dev = [
    "pytest>=9.1.1",
]
~~~

So \`uv add --dev\` writes to \`[dependency-groups]\`, the standard table, not to a uv-specific one. uv also created \`.venv\` and \`uv.lock\`; the first \`uv add\` printed \`Resolved 8 packages\` and installed 7 (httpx and its dependencies: anyio, certifi, h11, httpcore, idna, typing-extensions). The lock entry for each package records the exact version, where it came from and the sha256 of each file:

~~~text
[[package]]
name = "anyio"
version = "4.15.1"
source = { registry = "https://pypi.org/simple" }
dependencies = [
    { name = "idna" },
    { name = "typing-extensions", marker = "python_full_version < '3.15'" },
]
~~~

(The \`sdist\` and \`wheels\` lines below that, each with a \`hash = "sha256:..."\`, are left out here.)

Then we added \`"rich"\` to \`dependencies\` by hand, without locking, and asked uv to check:

~~~text
$ uv lock --check
Resolved 17 packages in 186ms
error: The lockfile at \`uv.lock\` needs to be updated, but \`--check\` was provided.

hint: To update the lockfile, run \`uv lock\`.
~~~

We also checked the opposite: after deleting \`httpx\` from \`dependencies\` by hand, a plain \`uv run python -c "print('ran')"\` re-locked first (the lock went from 14 packages to 7), synced \`.venv\`, and only then ran the command. So day to day the lock follows your edits automatically; the non-zero exit of \`--check\` is what CI should rely on: \`uv lock --check\`, or \`uv sync --locked\`, catches a pyproject and a lock that have drifted apart.

For a library, \`uv init --lib\` produced a \`src/\` layout (\`src/libdemo/__init__.py\` plus a \`py.typed\` marker) and added a build system that uses uv's own backend:

~~~toml
[build-system]
requires = ["uv_build>=0.11.32,<0.12.0"]
build-backend = "uv_build"
~~~

| Command | Reads | Writes | What it is for |
| :--- | :--- | :--- | :--- |
| \`uv init\` | nothing | \`pyproject.toml\`, \`.python-version\`, starter code | start a project |
| \`uv add pkg\` / \`uv remove pkg\` | \`pyproject.toml\` | \`pyproject.toml\`, \`uv.lock\`, \`.venv\` | change a dependency |
| \`uv lock\` | \`pyproject.toml\` | \`uv.lock\` | resolve exact versions |
| \`uv sync\` | \`uv.lock\` (re-locks if stale) | \`.venv\` | make the environment match |
| \`uv run cmd\` | both | \`.venv\` if needed | run inside the project environment |
| \`uv build\` | \`[build-system]\`, \`[project]\` | \`dist/*.tar.gz\`, \`dist/*.whl\` | make publishable files |

## 5. One More Place the Same TOML Lives: Single Scripts

📌 **Interview term: Inline script metadata** — PEP 723 lets a single \`.py\` file carry its own \`requires-python\` and \`dependencies\` in a comment block that starts with \`# /// script\` and ends with \`# ///\`. The content is TOML with a \`# \` prefix on each line, and \`uv run script.py\` reads it, builds a throwaway environment and runs the script ([PEP 723](https://peps.python.org/pep-0723/), [specification](https://packaging.python.org/en/latest/specifications/inline-script-metadata/)). Example 2 extracts such a block with a regular expression in the style of the spec and parses it with \`tomllib\`.

~~~python
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx"]
# ///
import httpx
~~~

## 6. Verified: Running the Code

Both examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical.

**Example 1 — parse a pyproject.toml with tomllib** prints:

~~~text
dict
['build-system', 'project', 'dependency-groups', 'tool']
invoice-api 1.4.0
['httpx>=0.27', 'pydantic>=2.6,<3']
hatchling.build
[{'include-group': 'test'}, 'ruff']
101
['ruff', 'uv']
True
TypeError: File must be opened in binary mode, e.g. use \`open('foo.toml', 'rb')\`
TOMLDecodeError: Invalid value (at line 2, column 8) | is ValueError: True
False False
~~~

**Example 2 — what a tool does with the tables (groups, names, requires-python, PEP 723)** prints:

~~~text
['pytest>=8', 'coverage', 'ruff', 'ipython']
cycle: a -> b -> a
['httpx', 'pydantic']
3.11 satisfies >=3.11: True
script {'requires-python': '>=3.11', 'dependencies': ['httpx']}
~~~

**What the output shows:**

- The parsed file is a plain \`dict\` whose top-level keys are the tables, and \`[tool.ruff]\` became \`data["tool"]["ruff"]\`, a nested dict with a real \`int\` (100 + 1 printed 101).
- An inline table \`{ include-group = "test" }\` is just a dict inside a list; Example 2 expands \`dev\` into \`test\`, \`lint\` and its own entries, and a cycle between groups is an error.
- Opening the file in text mode raised \`TypeError\`; bad TOML raised \`TOMLDecodeError\`, which is a \`ValueError\`; \`tomllib\` has neither \`dump\` nor \`dumps\`.
- The requirement \`"pydantic[email]>=2.6,<3"\` names the package \`pydantic\`: extras and version come after the name.

Two things were not run here: \`uv build\` (it would download the build backend), and the real version-specifier logic, which tools take from the \`packaging\` library. Example 2 checks \`requires-python\` with a deliberately simple \`>=\` comparison.

## 7. Edge Cases

- **Dotted keys and tables are the same thing.** \`[project.scripts]\` and \`scripts = {...}\` inside \`[project]\` parse to the same dict. Defining a table twice is a \`TOMLDecodeError\`.
- **Bare words are not strings.** \`name = invoice-api\` is invalid TOML (Example 1); strings need quotes.
- **\`requires-python\` is a range, not a pin.** \`">=3.11"\` admits 3.14; uv picks the interpreter from \`.python-version\` (here \`3.12\`) within that range.
- **\`version\` can be dynamic.** \`dynamic = ["version"]\` tells the backend to compute it (for example from a git tag), so tools must not read it from the table.
- **Extras in a requirement are not separate packages.** \`pydantic[email]\` installs pydantic plus its \`email\` extra's dependencies.

## Common Pitfalls

- **Opening the file in text mode for \`tomllib.load()\`.** It raises \`TypeError\`; always \`open(path, "rb")\`.
- **Putting test tools in \`[project] dependencies\`.** Every user of your package then installs pytest. Put them in a dependency group.
- **Committing \`.venv\` or not committing \`uv.lock\`.** The environment is disposable and machine-specific; the lock is what makes it reproducible.
- **Editing pyproject.toml by hand and not re-locking in CI.** Use \`uv sync --locked\` or \`uv lock --check\` so drift fails the build instead of silently re-resolving.
- **Pinning exact versions in a library's \`[project]\` dependencies.** \`httpx==0.28.1\` in a library forces that version on every user; use ranges in metadata and let the lock pin your own environment.
- **Expecting \`tomllib\` to write files.** It is read-only; rewriting with a naive dumper also throws away comments.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One file, four kinds of table:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[build-system]</code> says how to build, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project]</code> is the standard metadata, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[dependency-groups]</code> holds dev-only groups, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[tool.NAME]</code> is each tool's private settings.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Who reads it:</strong> <span style="color:#f0e2c8;">Build frontends read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[build-system]</code>, installers read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project]</code>, uv reads groups and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[tool.uv]</code>, ruff reads <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[tool.ruff]</code>. Every one of them parses it as TOML.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. tomllib:</strong> <span style="color:#f0e2c8;">Python 3.11 added <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomllib</code> to the standard library. It only reads: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">load()</code> needs a binary file, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loads()</code> takes a string, and errors raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TOMLDecodeError</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The uv loop:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv add</code> edits the file, locks and installs; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv lock</code> writes exact pins to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync</code> makes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.venv</code> match the lock; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv run</code> syncs first and then runs the command.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Ranges vs pins:</strong> <span style="color:#f0e2c8;">The pyproject says what you accept (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">httpx&gt;=0.27</code>); the lock says what you got (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">httpx 0.28.1</code> plus hashes). Commit both; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync --locked</code> in CI fails if they drifted.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tomllib.load()</code> insist on a binary file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">TOML is defined as UTF-8. Taking bytes lets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomllib</code> decode it itself and handle newlines exactly as the spec says, instead of trusting whatever encoding and newline mode you opened the file with. In text mode it raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError: File must be opened in binary mode</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write TOML if tomllib cannot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomllib</code> is read-only by design (PEP 680 left writing out because keeping comments and formatting is hard). Use a third-party library such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomli-w</code> to write, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomlkit</code> to edit a file while keeping its comments, which is what tools that edit pyproject files need.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[project.optional-dependencies]</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">[dependency-groups]</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Optional dependencies (extras) are published with the package: users install them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pip install pkg[pdf]</code>. Dependency groups (PEP 735) are never published; they are for working on the project itself, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">test</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lint</code>, and can include other groups.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">uv.lock</code> be committed? And <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">.venv</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Commit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv.lock</code> so every machine and CI run installs the same versions. Never commit <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.venv</code>: it is machine-specific and can be rebuilt from the lock with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync</code>. For a library, the lock pins your dev environment only; users still resolve from your <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project]</code> ranges.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you edit pyproject.toml by hand and forget to lock?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The lock is now stale. Plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv run</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync</code> re-locks automatically; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv lock --check</code> (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">uv sync --locked</code>) fails instead with an error that the lockfile needs to be updated, which is what you want in CI.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **pyproject.toml** | the standard configuration file at the root of a Python project |
| **TOML** | a small config format of tables, keys and values that maps directly onto a dict |
| **tomllib** | the standard-library TOML reader added in Python 3.11; read-only |
| **[build-system] table** | names the build backend and what to install to run it (PEP 518) |
| **[project] table** | standard, tool-neutral package metadata (PEP 621) |
| **Dependency group** | a named, unpublished list of dev requirements (PEP 735) |
| **Extra (optional dependency)** | a published optional feature set, installed as \`pkg[extra]\` |
| **Build frontend / backend** | the tool you run (\`uv build\`, \`pip\`) vs the library that builds the files (hatchling, setuptools, \`uv_build\`) |
| **Lockfile** | a file of exact resolved versions and hashes, here \`uv.lock\` |
| **Version specifier** | a range such as \`>=2.6,<3\` that a dependency must satisfy |
| **Inline script metadata** | a \`# /// script\` TOML block inside a single script (PEP 723) |

---
**Conclusion:** \`pyproject.toml\` is one TOML file shared by many readers: build frontends read \`[build-system]\`, installers and resolvers read the standard \`[project]\` metadata, project managers read \`[dependency-groups]\`, and each tool reads only its own \`[tool.NAME]\` table. \`tomllib\`, standard since Python 3.11, is how Python code reads it: binary file in, nested dict out, no writing. uv ties it together: \`uv add\` edits the ranges, \`uv lock\` records exact versions in \`uv.lock\`, \`uv sync\` makes \`.venv\` match, and \`uv run\` does both before running your command. Ranges in the pyproject, pins in the lock, both committed, the environment rebuilt on demand.`,
    examples: [
      { label: `Parse a pyproject.toml with tomllib (tables, binary mode, errors)`, code: `# Parse a pyproject.toml the way every Python tool does: with tomllib.
import os
import tempfile
import tomllib

PYPROJECT = """
[build-system]
requires = ["hatchling>=1.24"]
build-backend = "hatchling.build"

[project]
name = "invoice-api"
version = "1.4.0"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27", "pydantic>=2.6,<3"]

[project.optional-dependencies]
pdf = ["weasyprint>=62"]

[project.scripts]
invoice = "invoice_api.cli:main"

[dependency-groups]
test = ["pytest>=8"]
dev = [{ include-group = "test" }, "ruff"]

[tool.ruff]
line-length = 100

[tool.uv]
default-groups = ["dev"]
"""

data = tomllib.loads(PYPROJECT)
print(type(data).__name__)  # dict
print(list(data))
print(data["project"]["name"], data["project"]["version"])
print(data["project"]["dependencies"])
print(data["build-system"]["build-backend"])
print(data["dependency-groups"]["dev"])
print(data["tool"]["ruff"]["line-length"] + 1)
# Every tool gets its own namespace under [tool.NAME]
print(sorted(data["tool"]))

# tomllib.load() wants a BINARY file; text mode is a TypeError.
path = os.path.join(tempfile.mkdtemp(), "pyproject.toml")
with open(path, "w", encoding="utf-8") as f:
    f.write(PYPROJECT)
with open(path, "rb") as f:
    print(tomllib.load(f) == data)
try:
    with open(path, "r", encoding="utf-8") as f:
        tomllib.load(f)
except TypeError as e:
    print("TypeError:", e)

# Bad TOML raises TOMLDecodeError (a ValueError subclass) with a position.
try:
    tomllib.loads('[project]\\nname = invoice-api\\n')
except tomllib.TOMLDecodeError as e:
    print("TOMLDecodeError:", e, "| is ValueError:", isinstance(e, ValueError))

# tomllib only reads: there is no dump() in the standard library.
print(hasattr(tomllib, "dump"), hasattr(tomllib, "dumps"))` },
      { label: `What a tool does with it: dependency groups, names, requires-python, PEP 723`, code: `# What uv (or pip, or any tool) does with the tables it reads.
import re
import sys
import tomllib

doc = tomllib.loads("""
[project]
name = "invoice-api"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27", "pydantic[email]>=2.6,<3"]

[dependency-groups]
test = ["pytest>=8", "coverage"]
lint = ["ruff"]
dev = [{ include-group = "test" }, { include-group = "lint" }, "ipython"]
""")

# 1. Expand a dependency group: include-group pulls in another group.
def expand(groups, name, seen=()):
    if name in seen:
        raise ValueError("cycle: " + " -> ".join(seen + (name,)))
    out = []
    for item in groups[name]:
        if isinstance(item, dict):
            out += expand(groups, item["include-group"], seen + (name,))
        else:
            out.append(item)
    return out

groups = doc["dependency-groups"]
print(expand(groups, "dev"))
try:
    expand({"a": [{"include-group": "b"}], "b": [{"include-group": "a"}]}, "a")
except ValueError as e:
    print(e)

# 2. The package NAME is the part before any extra, version or marker.
NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*")
names = [NAME.match(req).group(0) for req in doc["project"]["dependencies"]]
print(names)

# 3. requires-python: a tool refuses an interpreter that does not match.
minimum = tuple(int(p) for p in doc["project"]["requires-python"][2:].split("."))
print(f"{sys.version_info[0]}.{sys.version_info[1]} satisfies >=3.11:", sys.version_info[:2] >= minimum)

# 4. PEP 723 inline script metadata: a TOML block hidden in comments.
SCRIPT = """\\
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "httpx",
# ]
# ///
import httpx
print(httpx.get("https://example.org").status_code)
"""
BLOCK = r"(?m)^# /// (?P<type>[a-zA-Z0-9-]+)$\\s(?P<content>(^#(| .*)$\\s)+)^# ///$"
m = re.search(BLOCK, SCRIPT)
toml_text = "".join(line[2:] if line.startswith("# ") else line[1:]
                    for line in m.group("content").splitlines(keepends=True))
meta = tomllib.loads(toml_text)
print(m.group("type"), meta)` },
    ],
  },
  {
    title: `How do you write tests in Python with unittest and pytest?`,
    difficulty: `medium`,
    seoDescription: `Python testing from zero: unittest TestCase, setUp and assertRaises, pytest fixtures, parametrize and plain asserts, and unittest.mock patching, all run.`,
    description: `**Question presented to candidate:**
"Say you have just written a pricing function and a small shopping-cart class. How would you test them in Python? Show me what a test looks like in unittest and in pytest, how you give each test a clean setup, how you test errors, and how you avoid calling a real external API."

**What a strong answer should cover:**
- unittest is the standard library's xUnit framework: subclass \`unittest.TestCase\`, name methods \`test_*\`, use \`self.assertEqual\` / \`assertRaises\`, and \`setUp\` / \`tearDown\` around every test; run with \`python -m unittest discover\`.
- pytest is the third-party de facto standard: plain functions and the plain \`assert\` statement (pytest rewrites asserts to print both sides on failure), and it also runs existing unittest tests unchanged.
- Fixtures: pytest injects them by parameter name, \`yield\` splits setup from teardown, built-ins such as \`tmp_path\` and \`monkeypatch\`; \`@pytest.mark.parametrize\` turns one test into a table of cases (unittest's nearest is \`subTest\`).
- Testing failure paths: \`assertRaises\` / \`pytest.raises(..., match=...)\`, and approximate float comparison (\`assertAlmostEqual\`, \`pytest.approx\`).
- Test doubles with \`unittest.mock\`: \`Mock\`, \`return_value\`, \`side_effect\`, \`assert_called_once_with\`, \`create_autospec\`, and patching where the name is looked up, not where it is defined.
- Good test hygiene: each test independent, fast and deterministic; no real network, clock or randomness without control.

**Clarifying questions expected:**
- Is the project already on unittest or pytest, and is adding a dev dependency acceptable?
- Which dependencies are external (HTTP APIs, databases, the clock) and need to be faked?

**Code / implementation expected:** Yes — a few real tests in either framework, including one error case and one mocked dependency.`,
    answer: `**Target Audience:** Beginners writing their first tests, and developers who use one framework and need to talk confidently about both.
**Difficulty:** Medium
**Python version:** The unittest and mock examples were run on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, CPython 3.11.3). The pytest runs were done with pytest 9.1.1 on CPython 3.13, because pytest is not part of the standard library and cannot run in the page.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output shown, including the pytest reports, was copied from a real run.

## 1. Why This Even Matters — A Story First

A bakery makes the same cake every day. On day one the baker tastes it and it is perfect. On day forty they swap the flour supplier, change the oven and add a new icing, and nobody tastes the plain sponge again until a customer complains. A smart baker keeps a short checklist: cut a slice, check it rises to 5 cm, check it is not too sweet, check the icing sets. It takes two minutes, and it runs every morning no matter what changed.

Tests are that checklist for code. You write small programs that call your code with known inputs and check the outputs. Run them after every change, and a broken discount calculation is caught on your laptop rather than on an invoice. Interviewers ask about testing because it is the clearest sign that someone has maintained code, not just written it once.

## 2. The Vocabulary First

📌 **Interview term: Unit test** — a small, fast, automated check of one piece of behaviour (one function, one method) in isolation from slow or external things such as networks and databases.

📌 **Interview term: Assertion** — the line inside a test that checks a fact: "this should equal 40.0". If it is false, the test fails.

📌 **Interview term: Test runner** — the program that finds your tests, runs each one, and prints which passed, failed, errored or were skipped. A **failure** means an assertion was false; an **error** means the test crashed with some other exception.

A good test reads in three steps, often called **Arrange, Act, Assert**: set up the inputs, call the code, check the result.

## 3. unittest: The Standard-Library Framework

unittest ships with Python, so it needs no installation. It follows the **xUnit** style that JUnit made popular: tests are methods on a class.

📌 **Interview term: TestCase** — the base class in \`unittest\`. Every method whose name starts with \`test\` is one test; helpers such as \`self.assertEqual(a, b)\`, \`self.assertIn(x, seq)\`, \`self.assertRaises(Error)\` and \`self.assertAlmostEqual(x, y)\` do the checking and print a useful message on failure.

~~~python
import unittest

class TestDiscount(unittest.TestCase):
    def test_half_off(self):
        self.assertEqual(apply_discount(80.0, 50), 40.0)

    def test_rejects_bad_percent(self):
        with self.assertRaises(ValueError) as ctx:
            apply_discount(10.0, 150)
        self.assertIn("between 0 and 100", str(ctx.exception))
~~~

📌 **Interview term: Fixture** — whatever a test needs to exist before it runs (a cart with one item, a temporary folder, a test database) and the cleanup afterwards. In unittest, \`setUp()\` runs before **every** test method and \`tearDown()\` after it, so each test gets fresh objects. \`setUpClass\` / \`tearDownClass\` run once per class for expensive setup.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Each test runs inside its own setup and teardown, so tests never share state">
  <defs>
    <marker id="py11q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="60" text-anchor="middle">setUp</text>
  <text class="d-sub" x="120" y="82" text-anchor="middle">or fixture before yield</text>
  <path class="d-edge" d="M 220 65 L 270 65" marker-end="url(#py11q2-arrow)"/>
  <rect class="d-box-accent" x="280" y="30" width="200" height="70" rx="10"/>
  <text class="d-text d-accent" x="380" y="60" text-anchor="middle">test_total</text>
  <text class="d-sub" x="380" y="82" text-anchor="middle">arrange, act, assert</text>
  <path class="d-edge" d="M 480 65 L 530 65" marker-end="url(#py11q2-arrow)"/>
  <rect class="d-box-muted" x="540" y="30" width="200" height="70" rx="10"/>
  <text class="d-text" x="640" y="60" text-anchor="middle">tearDown</text>
  <text class="d-sub" x="640" y="82" text-anchor="middle">or fixture after yield</text>
  <rect class="d-box-muted" x="20" y="140" width="200" height="70" rx="10"/>
  <text class="d-text" x="120" y="170" text-anchor="middle">setUp again</text>
  <text class="d-sub" x="120" y="192" text-anchor="middle">a brand new cart</text>
  <path class="d-edge" d="M 220 175 L 270 175" marker-end="url(#py11q2-arrow)"/>
  <rect class="d-box-accent" x="280" y="140" width="200" height="70" rx="10"/>
  <text class="d-text d-accent" x="380" y="170" text-anchor="middle">test_isolation</text>
  <text class="d-sub" x="380" y="192" text-anchor="middle">sees one item only</text>
  <path class="d-edge" d="M 480 175 L 530 175" marker-end="url(#py11q2-arrow)"/>
  <rect class="d-box-muted" x="540" y="140" width="200" height="70" rx="10"/>
  <text class="d-text" x="640" y="170" text-anchor="middle">tearDown again</text>
  <text class="d-sub" x="640" y="192" text-anchor="middle">clean up</text>
</svg>

Because \`setUp\` runs again before the second test, the book that \`test_total\` added is gone when \`test_isolation\` runs; Example 1 proves it.

**Many cases in one test.** \`with self.subTest(price=price, pct=pct):\` inside a loop reports each failing row separately and keeps going, instead of stopping at the first bad row.

**Running it.** From the project root:

~~~bash
python -m unittest discover -v
~~~

📌 **Interview term: Test discovery** — how a runner finds tests without being told. \`unittest discover\` imports files matching \`test*.py\` in packages under the start directory and collects \`TestCase\` subclasses. On our run against a \`tests/\` package it printed:

~~~text
test_half_off (tests.test_pricing.TestDiscount.test_half_off) ... ok
test_rejects_bad_percent (tests.test_pricing.TestDiscount.test_rejects_bad_percent) ... ok

----------------------------------------------------------------------
Ran 2 tests in 0.000s

OK
~~~

## 4. pytest: Plain Functions and Plain assert

pytest is a third-party package you add as a dev dependency (\`uv add --dev pytest\`; see [pyproject.toml and uv workflows](/interview-question/how-do-pyproject-toml-tomllib-and-uv-pyproject-workflows-fit-together)). Tests are plain functions, and the check is Python's own \`assert\` statement:

~~~python
import pytest

from pricing import apply_discount


def test_half_off():
    assert apply_discount(80.0, 50) == 40.0


@pytest.mark.parametrize(
    ("price", "pct", "expected"),
    [(100, 0, 100), (100, 100, 0), (19.99, 10, 17.99)],
)
def test_table(price, pct, expected):
    assert apply_discount(price, pct) == pytest.approx(expected)


def test_rejects_bad_percent():
    with pytest.raises(ValueError, match="between 0 and 100"):
        apply_discount(10.0, 150)


def test_cart_fixture(cart):
    cart.append(("book", 10.0))
    assert sum(p for _, p in cart) == 12.5


def test_tmp_path(tmp_path):
    f = tmp_path / "out.txt"
    f.write_text("hello")
    assert f.read_text() == "hello"


def test_monkeypatch_env(monkeypatch):
    monkeypatch.setenv("CURRENCY", "EUR")
    import os
    assert os.environ["CURRENCY"] == "EUR"
~~~

The fixture lives in \`conftest.py\`, a file pytest loads automatically and shares with every test in that folder:

~~~python
import pytest


@pytest.fixture
def cart():
    # setup runs before the test; code after yield is teardown
    items = [("pen", 2.5)]
    yield items
    items.clear()
~~~

Three ideas carry most of pytest:

1. **Fixtures by name.** \`def test_cart_fixture(cart):\` asks for the fixture called \`cart\`; pytest calls it, passes what it yields, and runs the code after \`yield\` as teardown. Built-in fixtures include \`tmp_path\` (a fresh \`pathlib.Path\` folder per test) and \`monkeypatch\` (set an attribute or environment variable and undo it afterwards).
2. **Parametrize.** \`@pytest.mark.parametrize\` runs one function once per row; each row is a separate test with its own ID.
3. **Helpers for awkward checks.** \`pytest.raises(ValueError, match=...)\` checks the exception and its message (a regex); \`pytest.approx\` compares floats with a tolerance.

📌 **Interview term: Parametrize** — generating one test per row of input data from a single test function. In the report below, \`test_table\` became three tests named after their inputs.

\`pytest -v\` on that file, on our run (pytest 9.1.1; the platform and rootdir lines are removed, and the timing is from our machine):

~~~text
============================= test session starts ==============================
collecting ... collected 8 items

test_pricing.py::test_half_off PASSED                                    [ 12%]
test_pricing.py::test_table[100-0-100] PASSED                            [ 25%]
test_pricing.py::test_table[100-100-0] PASSED                            [ 37%]
test_pricing.py::test_table[19.99-10-17.99] PASSED                       [ 50%]
test_pricing.py::test_rejects_bad_percent PASSED                         [ 62%]
test_pricing.py::test_cart_fixture PASSED                                [ 75%]
test_pricing.py::test_tmp_path PASSED                                    [ 87%]
test_pricing.py::test_monkeypatch_env PASSED                             [100%]

============================== 8 passed in 0.01s ===============================
~~~

### What a failure looks like

📌 **Interview term: Assertion rewriting** — when pytest imports a test module, it rewrites each \`assert\` so that a failure reports the values on both sides and a diff. Plain Python only raises a bare \`AssertionError\`. A deliberately failing test:

~~~python
def test_totals_match():
    expected = {"pen": 2.5, "book": 10.0}
    actual = {"pen": 2.5, "book": 12.0}
    assert actual == expected
~~~

~~~text
F                                                                        [100%]
=================================== FAILURES ===================================
______________________________ test_totals_match _______________________________

    def test_totals_match():
        expected = {"pen": 2.5, "book": 10.0}
        actual = {"pen": 2.5, "book": 12.0}
>       assert actual == expected
E       AssertionError: assert {'pen': 2.5, 'book': 12.0} == {'pen': 2.5, 'book': 10.0}
E         
E         Omitting 1 identical items, use -vv to show
E         Differing items:
E         {'book': 12.0} != {'book': 10.0}
E         Use -v to get more diff

test_fail.py:4: AssertionError
=========================== short test summary info ============================
FAILED test_fail.py::test_totals_match - AssertionError: assert {'pen': 2.5, ...
1 failed in 0.01s
~~~

pytest pointed at the line, showed both dicts, and named the one differing key. With unittest you get a similar message only because \`assertEqual\` builds it for you.

pytest also runs unittest tests unchanged: running \`pytest -q\` in the folder holding the unittest file from section 3 printed \`2 passed\`. That is why moving an old project to pytest can be gradual.

How does pytest do this? Example 3 is a 40-line toy runner that collects \`test_*\` functions, injects fixtures by reading each function signature with \`inspect.signature\`, expands a parametrize marker and reports results. It is not pytest, but it is the same idea.

## 5. Mocking: Testing Without the Real Dependency

Code that calls an HTTP API, a database or the clock is slow and unpredictable in tests. You replace the dependency with a stand-in.

📌 **Interview term: Test double / mock** — an object that stands in for a real dependency. \`unittest.mock.Mock\` accepts any attribute access and any call, records how it was used, and returns what you configure:

- \`client.get_rate.return_value = 0.5\` makes the call return 0.5.
- \`client.get_rate.side_effect = TimeoutError("api down")\` makes it raise; a list makes it return successive values.
- \`client.get_rate.assert_called_once_with("EUR")\` checks how it was called.

📌 **Interview term: Autospec** — \`mock.create_autospec(RatesClient, instance=True)\` builds a mock with the real class signature. A plain \`Mock\` happily accepts a misspelt \`client.get_rates(...)\`; the autospecced one raises \`AttributeError\`, which Example 2 checks.

📌 **Interview term: Patching** — temporarily replacing a name during a test: \`with mock.patch("builtins.open", fake):\` or \`@mock.patch("report.today")\`. The patch is undone when the block ends, even if the test fails. In pytest, \`monkeypatch.setattr(...)\` does the same job.

The rule that trips everyone up is **patch where the name is looked up**:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 240" role="img" aria-label="from weather import today copies the reference into report, so the patch must target report.today">
  <defs>
    <marker id="py11q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="230" height="70" rx="10"/>
  <text class="d-text" x="145" y="60" text-anchor="middle">module weather</text>
  <text class="d-sub" x="145" y="82" text-anchor="middle">today, the original</text>
  <rect class="d-box-accent" x="30" y="150" width="230" height="70" rx="10"/>
  <text class="d-text d-accent" x="145" y="180" text-anchor="middle">module report</text>
  <text class="d-sub" x="145" y="202" text-anchor="middle">its own name: today</text>
  <rect class="d-box" x="500" y="90" width="230" height="70" rx="10"/>
  <text class="d-text" x="615" y="120" text-anchor="middle">function object</text>
  <text class="d-sub" x="615" y="142" text-anchor="middle">returns rain</text>
  <path class="d-edge" d="M 260 65 L 494 115" marker-end="url(#py11q2-arrow2)"/>
  <path class="d-edge-accent" d="M 260 185 L 494 140" marker-end="url(#py11q2-arrow2)"/>
  <text class="d-sub" x="372" y="70" text-anchor="middle">weather.today</text>
  <text class="d-sub" x="372" y="200" text-anchor="middle">report.today</text>
</svg>

\`from weather import today\` gives the \`report\` module its own name pointing at the same function. Patching \`weather.today\` rebinds only the name in \`weather\`; \`report.today\` still points at the original. Example 2 shows both: patching \`weather.today\` still printed \`Today: rain\`, patching \`report.today\` printed \`Today: sun\`. Why the import behaves this way is covered in [the import system](/interview-question/how-does-the-python-import-system-work) and [names and references](/interview-question/how-does-python-s-name-and-object-reference-model-work); patching outside tests is [monkey patching](/interview-question/what-is-monkey-patching-in-python).

## 6. unittest vs pytest

| | unittest | pytest |
| :--- | :--- | :--- |
| Install | standard library | third-party dev dependency |
| Test shape | methods on a \`TestCase\` subclass | plain functions (classes optional) |
| Checks | \`self.assertEqual\`, \`assertRaises\`, ... | plain \`assert\`, \`pytest.raises\`, \`pytest.approx\` |
| Failure message | built by each \`assert*\` method | assertion rewriting: both values and a diff |
| Setup | \`setUp\` / \`tearDown\`, \`setUpClass\` | fixtures by name, \`yield\` teardown, scopes, \`conftest.py\` |
| Many cases | \`subTest\` (one test in the count) | \`parametrize\` (one test per row) |
| Runs the other | no | yes, runs unittest tests unchanged |
| Ecosystem | mock in the stdlib | plugins: coverage, xdist (parallel), asyncio, ... |

Choose unittest when you cannot add dependencies (a stdlib-only tool, a script in a locked-down environment); choose pytest for nearly everything else.

## 7. Verified: Running the Code

All three examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical. The examples run the tests through \`unittest.TextTestRunner\` writing to a \`StringIO\`, and drop the \`Ran N tests in 0.00Xs\` line and the indented traceback lines (file path and source line), because those vary between machines and the page runtime does not show source lines.

**Example 1 — unittest: TestCase, setUp isolation, assertRaises, subTest, skip and a deliberate failure** prints:

~~~text
test_half_off (__main__.TestDiscount.test_half_off) ... ok
test_rejects_bad_percent (__main__.TestDiscount.test_rejects_bad_percent) ... ok
test_table_of_cases (__main__.TestDiscount.test_table_of_cases) ... ok
test_deliberately_wrong (__main__.TestCart.test_deliberately_wrong) ... FAIL
test_isolation (__main__.TestCart.test_isolation) ... ok
test_later (__main__.TestCart.test_later) ... skipped 'shows how a skip is reported'
test_total (__main__.TestCart.test_total) ... ok

======================================================================
FAIL: test_deliberately_wrong (__main__.TestCart.test_deliberately_wrong)
----------------------------------------------------------------------
Traceback (most recent call last):
AssertionError: 2.5 != 3.0

----------------------------------------------------------------------

FAILED (failures=1, skipped=1)
testsRun: 7
failures: 1 errors: 0 skipped: 1
wasSuccessful: False
~~~

**Example 2 — unittest.mock: return_value, side_effect, autospec, mock_open and where to patch** prints:

~~~text
True
[call.anything.you.like()]
patched weather.today -> Today: rain
patched report.today  -> Today: sun
test_autospec_catches_typos (__main__.TestWithMocks.test_autospec_catches_typos) ... ok
test_injected_mock (__main__.TestWithMocks.test_injected_mock) ... ok
test_patch_builtin_open (__main__.TestWithMocks.test_patch_builtin_open) ... ok
test_side_effect_raises (__main__.TestWithMocks.test_side_effect_raises) ... ok
all passed: True
~~~

**Example 3 — a toy pytest: collection, fixtures by name, parametrize** prints:

~~~text
collected ['test_total', 'test_add']
test_total           PASSED
test_add[1-2-3]      PASSED
test_add[2-2-4]      PASSED
test_add[2-3-6]      FAILED 2 + 3 gave 5
~~~

**What the output shows:**

- unittest runs the test methods of each class in alphabetical order, not file order (\`test_deliberately_wrong\` ran before \`test_isolation\`). Never write tests that depend on order.
- \`test_isolation\` saw one item although \`test_total\` had added a book: \`setUp\` built a fresh cart for each test.
- A failure prints the readable \`AssertionError: 2.5 != 3.0\` because \`assertEqual\` builds that message; the run still finished every other test.
- Patching \`weather.today\` did not affect \`report.headline()\`; patching \`report.today\` did.
- The toy runner never collected \`helper_not_collected\`, and the failing parametrized row came out with its own ID, \`test_add[2-3-6]\`.

## 8. Edge Cases

- **A test with no assertion passes.** If the code under test silently does nothing, the test is green. Every test must assert something.
- **Mutable fixtures shared by scope.** A pytest fixture with \`scope="module"\` is created once and shared; if one test mutates it, the next test sees the change.
- **Floats.** \`assert apply_discount(19.99, 10) == 17.99\` happens to work because the function rounds, but compare computed floats with \`pytest.approx\` or \`assertAlmostEqual\` (see [why 0.1 + 0.2 != 0.3](/interview-question/why-does-0-1-0-2-0-3-in-python-and-when-do-you-use-decimal-or-fraction)).
- **\`assert\` with a tuple is always true.** \`assert (x == 1, "message")\` asserts a non-empty tuple; CPython even emits a \`SyntaxWarning\` for it. Write \`assert x == 1, "message"\`.
- **Tests that pass alone and fail together** almost always share state: a module-level list, an environment variable, a patched object that was never restored.

## Common Pitfalls

- **Patching where the function is defined instead of where it is used.** \`from x import f\` copies the name; patch \`yourmodule.f\`.
- **Using a plain \`Mock\` for a real class.** Typos and wrong arguments pass silently; use \`create_autospec\` or \`patch(..., autospec=True)\`.
- **Tests that hit the network, the real clock or \`random\`.** They become slow and flaky; inject or patch those dependencies and seed randomness.
- **Asserting too much in one test.** One behaviour per test, named for that behaviour (\`test_rejects_bad_percent\`), makes the failure report the diagnosis.
- **Catching the exception yourself instead of using \`raises\`.** A \`try\`/\`except\` around the call passes even when nothing is raised; \`pytest.raises\` and \`assertRaises\` fail in that case.
- **Order-dependent tests.** unittest sorts method names and pytest plugins can shuffle or parallelise; each test must set up its own world.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two frameworks:</strong> <span style="color:#f0e2c8;">unittest ships with Python: classes that subclass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TestCase</code>, methods named <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">test_*</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">self.assertEqual</code>. pytest is a dev dependency: plain functions and plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert</code>, and it also runs unittest tests unchanged.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fresh state per test:</strong> <span style="color:#f0e2c8;">unittest calls <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">setUp</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tearDown</code> around every test method; pytest fixtures are injected by parameter name, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yield</code> separating setup from teardown, plus built-ins such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tmp_path</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">monkeypatch</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Many cases, error paths:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@pytest.mark.parametrize</code> makes one test per row (unittest has <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subTest</code>); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pytest.raises(ValueError, match=...)</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assertRaises</code> test the failure path; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pytest.approx</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assertAlmostEqual</code> for floats.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Faking dependencies:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unittest.mock</code>: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Mock</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">return_value</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">side_effect</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert_called_once_with</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create_autospec</code> so typos fail, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">patch</code> on the name where it is looked up, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">report.today</code>, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weather.today</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What good looks like:</strong> <span style="color:#f0e2c8;">Each test independent, fast and deterministic, named after the behaviour it checks; no real network or clock. pytest wins on readability: on failure it shows both sides of the comparison and the differing keys.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can pytest use a plain <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">assert</code> and still show both values?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">pytest rewrites the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert</code> statements in test modules when it imports them, so a failing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert actual == expected</code> reports both sides and, for dicts, the differing items. In plain Python an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert</code> only raises a bare <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AssertionError</code>, which is why unittest needs <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assertEqual</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">patch</code> where the name is looked up mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">from weather import today</code> copies the reference into the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">report</code> module. Patching <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weather.today</code> changes the original but not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">report.today</code>, which still points at the real function. Patch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">report.today</code>, the name the code under test actually uses.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Mock or autospec?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Mock</code> accepts any attribute or call, so a misspelt method silently passes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">create_autospec(RatesClient, instance=True)</code> copies the real signature, so a wrong method name raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AttributeError</code> and wrong arguments raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you run only some tests, or stop at the first failure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">pytest: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pytest -k discount</code> selects by name, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pytest tests/test_pricing.py::test_half_off</code> runs one test, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-x</code> stops at the first failure, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-q</code> / <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-v</code> set verbosity. unittest: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python -m unittest tests.test_pricing.TestDiscount.test_half_off</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">-f</code> (failfast).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">subTest</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">parametrize</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subTest</code> keeps going after a failing row inside one test method, but it is still one test in the count. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parametrize</code> generates separate tests with their own IDs, such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">test_table[100-0-100]</code>, which you can select, rerun and see individually in the report.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Unit test** | a small automated check of one piece of behaviour, run in isolation |
| **Test runner** | the program that finds tests, runs them and reports the results |
| **TestCase** | the unittest base class whose \`test_*\` methods are tests |
| **Assertion** | the check inside a test; failing it marks the test FAILED |
| **Fixture** | reusable setup (and teardown) a test needs, such as a fresh cart or a temp folder |
| **Test discovery** | how the runner finds tests: files and names starting with \`test\` |
| **Parametrize** | running one test function once per row of input data |
| **Assertion rewriting** | pytest rewriting \`assert\` statements so a failure shows both values |
| **Test double / mock** | a stand-in object that replaces a real dependency in a test |
| **Patching** | temporarily replacing a name (function, class, attribute) during a test |
| **Autospec** | a mock that copies the real object signature, so misuse fails |

---
**Conclusion:** A Python test is a small function that arranges inputs, calls your code and asserts the result. unittest, in the standard library, puts tests on a \`TestCase\` with \`assert*\` methods and \`setUp\` / \`tearDown\`; pytest, the common choice, uses plain functions, plain \`assert\` (rewritten to show both values), fixtures injected by name and \`parametrize\` for tables of cases, and runs unittest tests too. Either way, dependencies you do not control are replaced with \`unittest.mock\` doubles, patched where the code looks them up, and every test stays independent, fast and deterministic.`,
    examples: [
      { label: `unittest: TestCase, setUp isolation, assertRaises, subTest and a deliberate failure`, code: `# unittest: the standard-library test framework (xUnit style).
import io
import unittest


def apply_discount(price, percent):
    if not 0 <= percent <= 100:
        raise ValueError("percent must be between 0 and 100")
    return round(price * (100 - percent) / 100, 2)


class Cart:
    def __init__(self):
        self.items = []

    def add(self, name, price):
        self.items.append((name, price))

    def total(self):
        return sum(price for _, price in self.items)


class TestDiscount(unittest.TestCase):
    def test_half_off(self):
        self.assertEqual(apply_discount(80.0, 50), 40.0)

    def test_rejects_bad_percent(self):
        with self.assertRaises(ValueError) as ctx:
            apply_discount(10.0, 150)
        self.assertIn("between 0 and 100", str(ctx.exception))

    def test_table_of_cases(self):
        cases = [(100, 0, 100), (100, 100, 0), (19.99, 10, 17.99)]
        for price, pct, expected in cases:
            # subTest: one failing row does not hide the others
            with self.subTest(price=price, pct=pct):
                self.assertAlmostEqual(apply_discount(price, pct), expected)


class TestCart(unittest.TestCase):
    def setUp(self):
        # runs before EVERY test method: each test gets a fresh cart
        self.cart = Cart()
        self.cart.add("pen", 2.5)

    def test_total(self):
        self.cart.add("book", 10.0)
        self.assertEqual(self.cart.total(), 12.5)

    def test_isolation(self):
        # the book from test_total is not here: setUp made a new cart
        self.assertEqual(len(self.cart.items), 1)

    def test_deliberately_wrong(self):
        self.assertEqual(self.cart.total(), 3.0)

    @unittest.skip("shows how a skip is reported")
    def test_later(self):
        pass


suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestDiscount)
suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(TestCart))
stream = io.StringIO()
result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)

for line in stream.getvalue().splitlines():
    # drop the "Ran N tests in 0.00Xs" timing line and the indented
    # traceback lines (file paths) so the output is the same everywhere
    if line.startswith("Ran ") or line.startswith("  "):
        continue
    print(line)
print("testsRun:", result.testsRun)
print("failures:", len(result.failures), "errors:", len(result.errors), "skipped:", len(result.skipped))
print("wasSuccessful:", result.wasSuccessful())` },
      { label: `unittest.mock: return_value, side_effect, autospec, mock_open and where to patch`, code: `# unittest.mock: replace a slow or external dependency inside a test.
import io
import json
import unittest
from unittest import mock


class RatesClient:
    """Pretend this calls a real HTTP API."""
    def get_rate(self, currency):
        raise RuntimeError("network calls are not allowed in unit tests")


def price_in(amount_usd, currency, client):
    rate = client.get_rate(currency)
    return round(amount_usd * rate, 2)


def load_config(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


class TestWithMocks(unittest.TestCase):
    def test_injected_mock(self):
        client = mock.Mock()
        client.get_rate.return_value = 0.5
        self.assertEqual(price_in(10, "EUR", client), 5.0)
        client.get_rate.assert_called_once_with("EUR")

    def test_side_effect_raises(self):
        client = mock.Mock()
        client.get_rate.side_effect = TimeoutError("api down")
        with self.assertRaises(TimeoutError):
            price_in(10, "EUR", client)

    def test_autospec_catches_typos(self):
        client = mock.create_autospec(RatesClient, instance=True)
        with self.assertRaises(AttributeError):
            client.get_rates("EUR")   # misspelt: a plain Mock would accept it

    def test_patch_builtin_open(self):
        fake = mock.mock_open(read_data='{"debug": true}')
        with mock.patch("builtins.open", fake):
            self.assertEqual(load_config("settings.json"), {"debug": True})
        fake.assert_called_once_with("settings.json", encoding="utf-8")


plain = mock.Mock()
print(isinstance(plain.anything.you.like(), mock.Mock))
print(plain.method_calls)

# "Patch where it is looked up": report did  from weather import today
import sys, types
weather = types.ModuleType("weather")
exec("def today():\\n    return 'rain'", weather.__dict__)
sys.modules["weather"] = weather
report = types.ModuleType("report")
exec("from weather import today\\ndef headline():\\n    return 'Today: ' + today()", report.__dict__)
sys.modules["report"] = report

with mock.patch("weather.today", return_value="sun"):
    print("patched weather.today ->", report.headline())
with mock.patch("report.today", return_value="sun"):
    print("patched report.today  ->", report.headline())

stream = io.StringIO()
suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestWithMocks)
result = unittest.TextTestRunner(stream=stream, verbosity=2).run(suite)
print("\\n".join(l for l in stream.getvalue().splitlines() if l.endswith("ok")))
print("all passed:", result.wasSuccessful())` },
      { label: `A toy pytest: collect test_* functions, inject fixtures by name, parametrize`, code: `# A 40-line toy version of what pytest does: collect test_* functions,
# inject fixtures by parameter NAME, expand parametrize, report plain asserts.
import inspect

FIXTURES = {}


def fixture(fn):
    FIXTURES[fn.__name__] = fn
    return fn


def parametrize(names, rows):
    def mark(fn):
        fn.params = (names.split(","), rows)
        return fn
    return mark


@fixture
def cart():
    items = [("pen", 2.5)]
    yield items          # setup above, teardown below
    items.clear()


def test_total(cart):
    cart.append(("book", 10.0))
    assert sum(p for _, p in cart) == 12.5


@parametrize("a,b,expected", [(1, 2, 3), (2, 2, 4), (2, 3, 6)])
def test_add(a, b, expected):
    assert a + b == expected, f"{a} + {b} gave {a + b}"


def helper_not_collected():
    raise RuntimeError("only names starting with test_ are collected")


def run_one(fn, kwargs):
    gens = []
    for name in inspect.signature(fn).parameters:
        if name in FIXTURES:
            gen = FIXTURES[name]()
            kwargs[name] = next(gen)
            gens.append(gen)
    try:
        fn(**kwargs)
        return "PASSED", ""
    except AssertionError as e:
        return "FAILED", str(e) or "assert failed (plain Python gives no details)"
    finally:
        for gen in gens:
            next(gen, None)          # run the teardown part


tests = [(n, f) for n, f in list(globals().items()) if n.startswith("test_") and callable(f)]
print("collected", [n for n, _ in tests])
for name, fn in tests:
    names, rows = getattr(fn, "params", ([], [()]))
    for row in rows:
        args = dict(zip(names, row))
        label = name + ("[" + "-".join(map(str, row)) + "]" if row else "")
        status, msg = run_one(fn, args)
        print(f"{label:<20} {status} {msg}".rstrip())` },
    ],
  },
  {
    title: `How do you measure and profile Python performance?`,
    difficulty: `medium`,
    seoDescription: `Measure and profile Python: perf_counter, timeit, cProfile and pstats columns, sampling profilers, tracemalloc for memory, with real verified output.`,
    description: `**Question presented to candidate:**
"A report endpoint written in Python has become slow, and a colleague wants to rewrite half of it. Before anyone changes code: how would you measure how slow it is, find out where the time and memory actually go, and prove that a fix helped?"

**What a strong answer should cover:**
- Measure before optimising: a repeatable benchmark, timed with \`time.perf_counter()\` for a block or \`timeit\` (many loops, several repeats, take the minimum) for small statements.
- Profile to find the hot spot: \`cProfile\` (a deterministic profiler, \`python -m cProfile -s cumulative app.py\`) and reading \`pstats\` columns: \`ncalls\` (with \`total/primitive\` for recursion), \`tottime\` vs \`cumtime\`.
- Know the profiler families and their overhead: deterministic (cProfile) vs sampling profilers (py-spy, and \`profiling.sampling\` in the standard library since Python 3.15) that can attach to a running process with little slowdown; line-level tools such as line_profiler.
- Memory is separate: \`sys.getsizeof\` is shallow, \`tracemalloc\` records allocations, peaks and the source lines responsible.
- Fix the algorithm or data structure first (a \`set\` instead of a \`list\` for membership, caching with \`lru_cache\`, a generator instead of a giant list), then re-measure the same benchmark.
- Caveats: noisy timings, warm-up, profiler overhead distorting tiny functions, and measuring on realistic data.

**Clarifying questions expected:**
- Is the problem latency of one request, throughput, or memory?
- Can we reproduce it locally with realistic data, or only in production (which favours a sampling profiler attached to the live process)?

**Code / implementation expected:** Optional — a \`timeit\` comparison or a \`cProfile\` run and how to read its table.`,
    answer: `**Target Audience:** Developers who have heard "profile before you optimise" but never actually read a profiler table; no prior performance work assumed.
**Difficulty:** Medium
**Python version:** Examples run on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, CPython 3.11.3). The command-line profiles were run on python3.11 and python3.12 on our machine; their timings are from that run only.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. All outputs in the **Verified** section were copied from real runs. Because timings change from run to run, the examples print **comparisons** (is the set faster than the list?) rather than raw seconds; the raw numbers from our machine are quoted in the prose.

## 1. Why This Even Matters — A Story First

Your commute to work has started taking an hour instead of forty minutes, and a friend tells you to buy a faster car. Before spending money, you time each stretch for a week. The motorway takes the same twelve minutes it always did. The extra twenty minutes are all at one junction where road works began last month. A faster car would have saved you nothing; leaving ten minutes earlier, or taking a different exit, saves all of it.

Programs are the same. Most of the time goes to a small part of the code, and that part is rarely the one you would guess. Performance work in Python is three habits: **measure** (time the whole trip, repeatably), **profile** (time each stretch to find the junction), and **change one thing, then measure again**. Interviewers ask this to see whether you guess or measure.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="The performance loop: benchmark, profile, change one thing, benchmark again">
  <defs>
    <marker id="py11q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="160" height="70" rx="10"/>
  <text class="d-text d-accent" x="100" y="70" text-anchor="middle">1. Benchmark</text>
  <text class="d-sub" x="100" y="92" text-anchor="middle">timeit, perf_counter</text>
  <path class="d-edge" d="M 180 75 L 210 75" marker-end="url(#py11q3-arrow)"/>
  <rect class="d-box" x="220" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="300" y="70" text-anchor="middle">2. Profile</text>
  <text class="d-sub" x="300" y="92" text-anchor="middle">cProfile, py-spy</text>
  <path class="d-edge" d="M 380 75 L 410 75" marker-end="url(#py11q3-arrow)"/>
  <rect class="d-box" x="420" y="40" width="160" height="70" rx="10"/>
  <text class="d-text" x="500" y="70" text-anchor="middle">3. Change one thing</text>
  <text class="d-sub" x="500" y="92" text-anchor="middle">algorithm first</text>
  <path class="d-edge" d="M 580 75 L 610 75" marker-end="url(#py11q3-arrow)"/>
  <rect class="d-box-accent" x="620" y="40" width="120" height="70" rx="10"/>
  <text class="d-text d-accent" x="680" y="70" text-anchor="middle">4. Re-run</text>
  <text class="d-sub" x="680" y="92" text-anchor="middle">same benchmark</text>
  <path class="d-edge-dashed" d="M 680 110 L 680 190 L 100 190 L 100 116" marker-end="url(#py11q3-arrow)"/>
  <text class="d-sub" x="390" y="220" text-anchor="middle">still too slow: profile again</text>
</svg>

Each step feeds the next, and the dashed arrow is the loop: if the benchmark is still too slow after a change, you profile again, because the hot spot has usually moved.

## 2. Measuring: Clocks and timeit

📌 **Interview term: Benchmark** — a fixed, repeatable piece of work you time, ideally on realistic data. Without one, "it feels faster" is the only evidence.

📌 **Interview term: Wall-clock vs CPU time** — wall-clock time is what a stopwatch shows; CPU time is how long the processor actually worked on your process. A request waiting on a database has lots of wall-clock time and little CPU time; a profiler that only counts CPU will not show the wait.

### time.perf_counter() for one block

📌 **Interview term: perf_counter** — \`time.perf_counter()\` returns a float in seconds from the highest-resolution clock available. It is **monotonic** (never jumps backwards when the system clock is adjusted), which \`time.time()\` is not. Only the difference between two readings means anything.

~~~python
import time
start = time.perf_counter()
do_work()
elapsed = time.perf_counter() - start   # seconds, as a float
~~~

### timeit for small statements

📌 **Interview term: timeit** — the standard-library micro-benchmark tool. It runs a statement \`number\` times in a loop (so that each measurement is long enough to time accurately), repeats that \`repeat\` times, and returns one total per repeat. Report the **minimum**: interference can only add time.

~~~python
import timeit
setup = "data_list = list(range(10_000)); data_set = set(data_list)"
timeit.repeat("9_999 in data_list", setup=setup, number=2_000, repeat=5)
timeit.repeat("9_999 in data_set", setup=setup, number=2_000, repeat=5)
~~~

On our python3.11 run the best list time was about 0.096 s and the best set time about 0.000037 s for 2000 lookups: the set was roughly 2500 times faster, because a list is scanned item by item and a set jumps straight to a hash slot ([how a set finds items](/interview-question/how-does-a-python-set-find-items)). From the shell, the same tool is \`python -m timeit -s "setup" "statement"\`, which picks the loop count itself. \`Timer.autorange()\` does that from code: it raises the loop count through 1, 2, 5, 10, 20, 50 and so on until one run takes at least 0.2 seconds, which Example 1 checks.

Example 1 also compares \`s += str(i)\` with \`"".join(...)\`. At 500 items they were within a few percent of each other on our run (ratio about 1.08), because CPython can often resize a string in place when nothing else refers to it. That is a CPython implementation detail, not a language guarantee, which is why \`"".join\` is still the recommended idiom; the point of the measurement is that "everyone knows X is faster" is worth checking.

## 3. Profiling: Where Does the Time Go?

📌 **Interview term: Profiler** — a tool that runs your program and reports how much time each function took and how often it was called.

📌 **Interview term: Hot spot** — the small part of the code where most of the time goes. The profiler finds it; your intuition usually does not.

### cProfile from the command line

The standard library ships \`cProfile\`. The quickest use needs no code changes:

~~~bash
python -m cProfile -s cumulative slow_report.py
~~~

\`slow_report.py\` builds 20000 small dicts through a JSON round trip and computes \`fib(22)\` recursively:

~~~python
import json


def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


def load(n):
    return [json.loads(json.dumps({"id": i, "sq": i * i})) for i in range(n)]


def main():
    rows = load(20_000)
    print(len(rows), fib(22))


if __name__ == "__main__":
    main()
~~~

The top of the table on our python3.11 run (timings are from our machine):

~~~text
20000 17711
         380529 function calls (323103 primitive calls) in 0.299 seconds

   Ordered by: cumulative time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
      5/1    0.000    0.000    0.299    0.299 {built-in method builtins.exec}
        1    0.002    0.002    0.299    0.299 slow_report.py:1(<module>)
        1    0.000    0.000    0.292    0.292 slow_report.py:12(main)
        1    0.000    0.000    0.269    0.269 slow_report.py:8(load)
        1    0.029    0.029    0.269    0.269 slow_report.py:9(<listcomp>)
    20000    0.025    0.000    0.124    0.000 __init__.py:299(loads)
    20000    0.014    0.000    0.116    0.000 __init__.py:183(dumps)
    20000    0.033    0.000    0.103    0.000 encoder.py:183(encode)
    20000    0.040    0.000    0.092    0.000 decoder.py:332(decode)
    20000    0.060    0.000    0.060    0.000 encoder.py:205(iterencode)
~~~

How to read the columns:

📌 **Interview term: tottime / cumtime** — \`tottime\` is time spent inside the function body itself; \`cumtime\` also includes every function it called. \`load\` has a small \`tottime\` and a large \`cumtime\`: the time is in what it calls (\`json.loads\`, \`json.dumps\`).

- \`ncalls\` is the number of calls. **\`percall\`** appears twice: \`tottime / ncalls\` and \`cumtime / primitive calls\`.
- The first line says 380529 calls, of which 323103 were **primitive**.

📌 **Interview term: Primitive call** — a call that was not caused by recursion. Further down the same table, \`fib\` appeared as \`57313/1\`: 57313 calls in total, only one of them from outside \`fib\` itself.

The profile answers the question at once: almost all of the time is the JSON round trip in \`load\`, not \`fib\`, which on a separate run of the same command took about 0.016 s of roughly 0.3 s. Rewriting \`fib\` would have been the faster-car mistake.

A CPython version detail shows up here too. On 3.11 the list comprehension inside \`load\` appears as its own row, \`slow_report.py:9(<listcomp>)\`. On python3.12 the same command had no \`<listcomp>\` row at all, because Python 3.12 inlines comprehensions into the function that contains them ([PEP 709](https://peps.python.org/pep-0709/)). Do not be surprised when profiles of the same code differ between versions.

### cProfile from code, and pstats

Inside a program, \`cProfile.Profile()\` with \`enable()\` / \`disable()\` profiles just one section, and \`pstats.Stats\` reads the result: \`.sort_stats("cumulative").print_stats(10)\` prints the same table, and \`stats.stats\` is the raw dict behind it, mapping \`(file, line, function)\` to \`(primitive calls, total calls, tottime, cumtime, callers)\`. Example 2 profiles a report function that calls a naive recursive \`fib(20)\` and a cached one: the naive version made 21891 calls, the \`lru_cache\` version 21, one per distinct argument. More on that cache in [how functools.lru_cache works](/interview-question/how-does-functools-lru-cache-work).

For a picture instead of a table, save the profile (\`python -m cProfile -o out.prof app.py\`) and open it in a viewer such as snakeviz, or turn it into a flame graph. Those viewers are third-party and were not run here.

### Deterministic vs sampling profilers

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="A deterministic profiler hooks every call; a sampling profiler looks at the stack on a timer">
  <rect class="d-box" x="20" y="20" width="340" height="190" rx="12"/>
  <text class="d-text" x="190" y="50" text-anchor="middle">Deterministic: cProfile</text>
  <rect class="d-box-accent" x="50" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-accent" x="110" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-accent" x="170" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-accent" x="230" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-accent" x="290" y="75" width="40" height="30" rx="4"/>
  <text class="d-sub" x="190" y="140" text-anchor="middle">a hook on every call and return</text>
  <text class="d-sub" x="190" y="170" text-anchor="middle">exact counts, more overhead</text>
  <rect class="d-box" x="400" y="20" width="340" height="190" rx="12"/>
  <text class="d-text" x="570" y="50" text-anchor="middle">Sampling: py-spy, Tachyon</text>
  <rect class="d-box-muted" x="430" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-accent" x="490" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-muted" x="550" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-muted" x="610" y="75" width="40" height="30" rx="4"/>
  <rect class="d-box-accent" x="670" y="75" width="40" height="30" rx="4"/>
  <text class="d-sub" x="570" y="140" text-anchor="middle">read the stack on a timer</text>
  <text class="d-sub" x="570" y="170" text-anchor="middle">estimates, tiny overhead</text>
</svg>

cProfile hooks every call and return (left), so its counts are exact but each call pays a small cost; a sampling profiler (right) only looks at the stack every few milliseconds, so it estimates where time goes at almost no cost.

📌 **Interview term: Deterministic (tracing) profiler** — records every function call and return. Exact call counts; but the hook costs a little on every call, so code made of many tiny calls looks slower than it is.

📌 **Interview term: Sampling profiler** — interrupts at intervals and records the current call stack; the functions that show up most often are where the time goes. Low overhead, and some can attach to an already running process. py-spy is the well-known third-party one (\`py-spy record -o profile.svg --pid 1234\` draws a flame graph; \`py-spy top\` is a live view). Python 3.15, released on 9 October 2026 ([python.org](https://www.python.org/downloads/release/python-3150/)), adds a sampling profiler to the standard library as \`profiling.sampling\` (codename Tachyon), and moves cProfile under \`profiling.tracing\` with \`cProfile\` kept as an alias ([PEP 799](https://peps.python.org/pep-0799/), [What's New in 3.15](https://docs.python.org/3.15/whatsnew/3.15.html)). We did not have a 3.15 interpreter to run it on.

Other tools worth naming:

| Tool | Kind | Good for | In stdlib? |
| :--- | :--- | :--- | :--- |
| \`time.perf_counter\` | clock | timing one block | yes |
| \`timeit\` | micro-benchmark | comparing two small snippets | yes |
| \`cProfile\` + \`pstats\` | deterministic profiler | which functions are hot, call counts | yes |
| \`profiling.sampling\` | sampling profiler | live processes, low overhead | yes, 3.15+ |
| py-spy | sampling profiler | production, attach by PID, flame graphs | no |
| line_profiler | line-level tracer | which line inside one function | no |
| \`tracemalloc\` | allocation tracer | memory peaks and which line allocated | yes |
| \`python -X importtime\` | import timer | slow start-up | yes |
| Linux \`perf\` with \`-X perf\` | system profiler | Python frames next to C frames | yes, 3.12+ on Linux |

The \`-X perf\` mode, added in Python 3.12, makes Python function names visible to the Linux \`perf\` profiler ([Python support for the Linux perf profiler](https://docs.python.org/3.12/howto/perf_profiling.html)). \`python -X importtime -c "import json"\` printed, as its last line on our run, \`import time:       323 |      10609 | json\` (self and cumulative microseconds).

## 4. Measuring Memory

📌 **Interview term: Shallow size** — \`sys.getsizeof(obj)\` reports the size of that one object only. For a list it is the list header plus its array of pointers, not the objects the pointers lead to. Example 3 shows that the ints in a 100000-item list cost more than the list itself.

📌 **Interview term: tracemalloc** — a standard-library module that records every memory block Python allocates, with the line that allocated it. \`tracemalloc.get_traced_memory()\` returns \`(current, peak)\` bytes since \`start()\`, and \`take_snapshot().statistics("lineno")\` groups live allocations by source line, largest first.

On our 64-bit python3.11 run, summing 200000 doubled numbers peaked at 8020104 bytes through a list comprehension and 472 bytes through a generator expression: the list holds every item at once, the generator one at a time. Example 3 prints the comparison rather than these numbers, because sizes differ on the 32-bit page runtime. The full story is in [list comprehension vs generator memory](/interview-question/what-is-the-memory-difference-between-a-list-comprehension-and-a-generator-expre).

## 5. Verified: Running the Code

All three examples were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1); the outputs were identical. Example 1 prints only comparisons with wide margins (a 20 times threshold for a gap that was about 2500 times on our machine), so it gives the same output on a slow or fast computer.

**Example 1 — perf_counter, timeit.repeat and autorange** prints:

~~~text
perf_counter monotonic: True
elapsed is a float in seconds: True
runs per repeat: 5 5
set lookup at least 20x faster: True
01234 01234 True
same order of magnitude: True
autorange loops is a power-of-ten multiple: True
autorange took at least 0.2 s: True
~~~

**Example 2 — cProfile and pstats: call counts, recursion and ranking** prints:

~~~text
result: (2000, 6765, 6765)
fib         ncalls=21891/1
fib_cached  ncalls=21/1
parse       ncalls=1
report      ncalls=1
highest cumulative time: report
['ncalls', 'tottime', 'percall', 'cumtime', 'percall', 'filename:lineno(function)']
~~~

**Example 3 — sys.getsizeof vs tracemalloc: peaks and the line responsible** prints:

~~~text
ints cost more than the list itself: True
same answer: True
list peak over 1 MB: True
generator peak under 10 KB: True
list needs over 100x more peak memory: True
top allocation is the cache line: True
top line holds over 1 MB: True
blocks allocated there over 20000: True
~~~

**What the output shows:**

- Call counts from a deterministic profiler are exact and repeatable: \`fib ncalls=21891/1\` on every run, while the times change.
- \`lru_cache\` cut 21891 calls to 21: the biggest wins are usually algorithmic, not micro-tuning.
- \`report\` has the highest cumulative time because cumulative time includes its callees.
- The tracemalloc snapshot pointed at the exact line that built the 20000-entry dict.

## 6. Edge Cases

- **Profiler overhead skews tiny functions.** Under cProfile a function called a million times pays the hook a million times; confirm a suspected hot spot with \`timeit\` or a sampling profiler.
- **Warm-up.** The first call may import modules, fill caches or build lookup tables; time steady-state calls, or report first-call cost separately.
- **Threads and async.** cProfile profiles the thread that enabled it; time spent waiting on I/O appears as wall-clock in \`await\` or socket calls, not as CPU in your code.
- **\`timeit\` disables garbage collection** during timing by default; if your code creates many cycles, add \`gc.enable()\` to the setup to see the real cost.
- **Benchmarks on toy data lie.** An O(n squared) loop looks fine on 100 rows and collapses on a million; benchmark at production sizes.

## Common Pitfalls

- **Optimising without a profile.** You rewrite the function you suspect and the real hot spot is elsewhere, as \`fib\` vs the JSON round trip showed.
- **Timing with \`time.time()\` once.** It is not monotonic and a single run is noise; use \`perf_counter\` and repeat, or \`timeit\`.
- **Reading \`tottime\` as "total time".** It is time in the function itself; \`cumtime\` is the inclusive one.
- **Trusting \`sys.getsizeof\` for container memory.** It is shallow; use \`tracemalloc\` or sum the contents.
- **Changing several things at once.** You cannot tell which change helped or hurt; change one thing per measurement.
- **Profiling production with cProfile.** The overhead and restart are costly; attach a sampling profiler instead.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Measure first:</strong> <span style="color:#f0e2c8;">Write a repeatable benchmark on realistic data. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">time.perf_counter()</code> for a block; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeit</code> for small statements: many loops, several repeats, keep the minimum because noise only adds time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Then profile:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python -m cProfile -s cumulative app.py</code> shows where time goes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tottime</code> is time inside the function itself, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cumtime</code> includes its callees, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">57313/1</code> in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ncalls</code> means recursion: total calls over primitive calls.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pick the right profiler:</strong> <span style="color:#f0e2c8;">cProfile hooks every call, so counts are exact but tiny functions look slower. Sampling profilers (py-spy, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">profiling.sampling</code> in Python 3.15) read the stack on a timer and can attach to a live process.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Memory is separate:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.getsizeof</code> is shallow, it ignores what an object points to. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tracemalloc</code> records allocations: current and peak bytes, and snapshots grouped by source line show which line allocated what.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Fix and prove it:</strong> <span style="color:#f0e2c8;">Change one thing, usually the algorithm or data structure: a set instead of a list for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">in</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">lru_cache</code>, a generator instead of a list. Re-run the same benchmark; keep the change only if the numbers moved.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why take the minimum of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">timeit.repeat</code>, not the mean?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Background work, other processes and cache effects can only make a run slower, never faster than the code really is. The minimum is the best estimate of the cost of the code itself; the spread tells you how noisy the machine is. The <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeit</code> documentation makes the same recommendation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tottime</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">cumtime</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tottime</code> is time spent in the function body itself, excluding calls it makes. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cumtime</code> includes everything it called. Sort by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cumtime</code> to find the expensive top-level path, then by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tottime</code> to find the function actually burning CPU.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you profile a service that is only slow in production?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use a sampling profiler that attaches to the running process by PID, such as py-spy (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">py-spy top --pid 1234</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">py-spy record</code>), or in Python 3.15 the standard-library <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">profiling.sampling</code>. They do not need a restart and add little overhead, unlike running the service under cProfile.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x in some_list</code> slow and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">x in some_set</code> fast?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A list is scanned item by item, O(n). A set hashes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> and jumps to its slot, O(1) on average. In Example 1 the set lookup was over 2500 times faster on 10000 items when the item was at the end of the list. See [how a set finds items](/interview-question/how-does-a-python-set-find-items).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your profile shows most time in <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">json.loads</code>. What next?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">First ask whether the call is needed at all: are you decoding the same data repeatedly, or round-tripping through JSON for no reason? Then batch, cache or move the work. Only if the work is truly needed swap in a faster library (orjson, for example), and measure again.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Benchmark** | a repeatable measurement of how long a fixed piece of work takes |
| **Wall-clock vs CPU time** | elapsed real time vs time the CPU spent on this process |
| **perf_counter** | the highest-resolution monotonic clock in \`time\`, for measuring durations |
| **timeit** | the stdlib micro-benchmark tool: loops, repeats, minimum |
| **Profiler** | a tool that reports where a program spends its time |
| **Deterministic (tracing) profiler** | records every call and return: exact counts, more overhead (cProfile) |
| **Sampling profiler** | records the call stack at intervals: estimates, very low overhead (py-spy, Tachyon) |
| **tottime / cumtime** | time inside a function itself / including everything it called |
| **Primitive call** | a call not caused by recursion; \`ncalls\` shows \`total/primitive\` |
| **Hot spot** | the small part of the code where most of the time goes |
| **tracemalloc** | the stdlib module that traces memory allocations and peaks |
| **Shallow size** | what \`sys.getsizeof\` reports: the object only, not what it references |

---
**Conclusion:** Performance work in Python is a loop: benchmark realistic work with \`perf_counter\` or \`timeit\` (repeat, keep the minimum), profile to find the hot spot with cProfile and read \`ncalls\`, \`tottime\` and \`cumtime\` correctly, use a sampling profiler such as py-spy or Python 3.15's \`profiling.sampling\` when the problem lives in production, and measure memory separately with \`tracemalloc\` because \`sys.getsizeof\` is shallow. Then change one thing, usually the algorithm or data structure, and re-run the same benchmark to prove it helped.`,
    examples: [
      { label: `perf_counter, timeit.repeat and autorange: list vs set membership`, code: `# Measure first: time.perf_counter for one-off timings, timeit for micro-benchmarks.
import time
import timeit

info = time.get_clock_info("perf_counter")
print("perf_counter monotonic:", info.monotonic)

# A one-off measurement of a block of code.
start = time.perf_counter()
total = sum(i * i for i in range(200_000))
elapsed = time.perf_counter() - start
print("elapsed is a float in seconds:", isinstance(elapsed, float) and elapsed > 0)

# timeit: run the statement many times, repeat, keep the MINIMUM.
setup = "data_list = list(range(10_000)); data_set = set(data_list)"
list_times = timeit.repeat("9_999 in data_list", setup=setup, number=2_000, repeat=5)
set_times = timeit.repeat("9_999 in data_set", setup=setup, number=2_000, repeat=5)
best_list, best_set = min(list_times), min(set_times)
print("runs per repeat:", len(list_times), len(set_times))
print("set lookup at least 20x faster:", best_list / best_set > 20)

# The same tool on functions you wrote (globals= lets timeit see them).
def concat_plus(n):
    s = ""
    for i in range(n):
        s += str(i)
    return s

def concat_join(n):
    return "".join(str(i) for i in range(n))

print(concat_plus(5), concat_join(5), concat_plus(500) == concat_join(500))
t_plus = min(timeit.repeat("concat_plus(500)", globals=globals(), number=200, repeat=5))
t_join = min(timeit.repeat("concat_join(500)", globals=globals(), number=200, repeat=5))
# Both are fine at this size: within a factor of 5 of each other.
print("same order of magnitude:", 0.2 < t_plus / t_join < 5)

# autorange picks a loop count so one repeat takes at least 0.2 seconds.
timer = timeit.Timer("sorted(range(1000, 0, -1))")
loops, seconds = timer.autorange()
print("autorange loops is a power-of-ten multiple:", str(loops).strip("0") in {"1", "2", "5"})
print("autorange took at least 0.2 s:", seconds >= 0.2)` },
      { label: `cProfile and pstats: exact call counts, recursion and cumulative time`, code: `# cProfile: a deterministic profiler. It records every call, so call COUNTS
# are exact (and printable here); the times vary per machine, so we only rank.
import cProfile
import io
import pstats
from functools import lru_cache


def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)


@lru_cache(maxsize=None)
def fib_cached(n):
    return n if n < 2 else fib_cached(n - 1) + fib_cached(n - 2)


def parse(lines):
    return [line.split(",") for line in lines]


def report():
    rows = parse([f"{i},{i * i}" for i in range(2_000)])
    slow = fib(20)
    fast = fib_cached(20)
    return len(rows), slow, fast


profiler = cProfile.Profile()
profiler.enable()
result = report()
profiler.disable()
print("result:", result)

stats = pstats.Stats(profiler)
# stats.stats maps (file, line, name) -> (primitive calls, total calls, tottime, cumtime, callers)
counts = {}
for (filename, line, name), (prim, total, tt, ct, callers) in stats.stats.items():
    if name in {"fib", "fib_cached", "parse", "report"}:
        counts[name] = (total, prim)
for name in sorted(counts):
    total, prim = counts[name]
    shown = f"{total}/{prim}" if total != prim else str(total)
    print(f"{name:<11} ncalls={shown}")

# Rank by cumulative time: report() includes everything it called.
top = sorted((v[3], k[2]) for k, v in stats.stats.items() if k[2] in counts)
print("highest cumulative time:", top[-1][1])

# The usual human-readable table (we print only its header line here).
buf = io.StringIO()
pstats.Stats(profiler, stream=buf).sort_stats("cumulative").print_stats(5)
header = [l for l in buf.getvalue().splitlines() if "ncalls" in l][0]
print(header.split())` },
      { label: `Memory: sys.getsizeof vs tracemalloc peaks and snapshots`, code: `# Memory: sys.getsizeof is ONE object; tracemalloc follows every allocation.
import sys
import tracemalloc

numbers = list(range(100_000))
# getsizeof counts the list object and its pointer array, NOT the ints in it
shallow = sys.getsizeof(numbers)
deep = shallow + sum(sys.getsizeof(n) for n in numbers)
print("ints cost more than the list itself:", deep > 2 * shallow)

def build_list(n):
    return sum([i * 2 for i in range(n)])

def build_gen(n):
    return sum(i * 2 for i in range(n))

def peak_bytes(fn, n):
    tracemalloc.start()
    fn(n)
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak

p_list = peak_bytes(build_list, 200_000)
p_gen = peak_bytes(build_gen, 200_000)
print("same answer:", build_list(1000) == build_gen(1000))
print("list peak over 1 MB:", p_list > 1_000_000)
print("generator peak under 10 KB:", p_gen < 10_000)
print("list needs over 100x more peak memory:", p_list > 100 * p_gen)

# Snapshots answer WHERE the memory went, grouped by source line.
tracemalloc.start()
cache_line = sys._getframe().f_lineno + 1
cache = {i: str(i) * 10 for i in range(20_000)}   # the big one
small = [0] * 1_000
snapshot = tracemalloc.take_snapshot()
tracemalloc.stop()
top = snapshot.statistics("lineno")[0]
print("top allocation is the cache line:", top.traceback[0].lineno == cache_line)
print("top line holds over 1 MB:", top.size > 1_000_000)
print("blocks allocated there over 20000:", top.count > 20_000)` },
    ],
  },
  {
    title: `What are common Python security pitfalls?`,
    difficulty: `medium`,
    seoDescription: `Python security pitfalls, run and explained: eval, pickle, SQL and shell injection, path traversal, random vs secrets, compare_digest, assert and tarfile.`,
    description: `**Question presented to candidate:**
"You are reviewing a pull request for a Python web service. What security mistakes would you look for that are specific to Python or common in Python code, and what would you ask the author to use instead?"

**What a strong answer should cover:**
- Turning data into code: \`eval\` / \`exec\` on input (use \`ast.literal_eval\` or \`json\`), \`pickle\` or an unsafe YAML loader on untrusted bytes (they can run code), user-controlled \`str.format\` templates that read attributes.
- Injection into other interpreters: SQL built with f-strings (use \`?\` / \`%s\` placeholders), shell commands with \`shell=True\` (pass an argument list), and path traversal with \`../\` (resolve and check \`is_relative_to\`).
- Secrets: \`random\` is predictable, use \`secrets\`; compare tokens with \`hmac.compare_digest\`; store passwords with a slow, salted KDF (\`hashlib.scrypt\`, \`pbkdf2_hmac\`, or argon2/bcrypt), never a bare hash.
- Python-specific traps: \`assert\` disappears under \`python -O\`; \`tarfile.extractall\` without \`filter="data"\` before 3.14; untrusted XML without defusedxml.
- Supply chain and configuration: typosquatted packages, unpinned dependencies (lock with hashes), \`verify=False\`, debug mode and secrets in logs or source.

**Clarifying questions expected:**
- Where does untrusted input enter (HTTP bodies, uploaded files, message queues), and what does the service do with it?

**Code / implementation expected:** Optional — short before and after snippets, such as a parameterised query or \`literal_eval\` instead of \`eval\`.`,
    answer: `**Target Audience:** Developers who write Python services or scripts and want a concrete checklist; no security background assumed.
**Difficulty:** Medium
**Python version:** Examples 1 and 2 were run on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, CPython 3.11.3). Example 3 needs \`sqlite3\` and the \`tarfile\` filters, which the page runtime does not have, so it was run on python3.12 (and gave identical output on python3.13).

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every attack shown was actually run against the example code, and the **Verified** section quotes the real output.

## 1. Why This Even Matters — A Story First

A hotel front desk takes notes from guests and hands them to staff. "Please bring two towels to room 12" is fine. Then someone writes "Please bring two towels to room 12, and give the bearer the master key". A careful clerk treats every note as a *request about towels*, and fills in a form with a room-number box and a towel-count box. A careless clerk reads the note aloud to the staff as an instruction.

Almost every Python security bug is the careless clerk. Text from outside reaches something that *executes* text: the Python interpreter (\`eval\`, \`pickle\`), the database (a SQL string), the shell, or the file system (a path). The defence is always the same idea: keep the instruction fixed and pass the outsider's text only as a value in a box.

📌 **Interview term: Untrusted input** — anything an attacker could influence: request bodies, query strings, headers, cookies, uploaded files, messages from a queue, even rows another service wrote to your database.

📌 **Interview term: Trust boundary** — the line where outside data enters code that trusts it. Validation and safe APIs belong at that line.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Untrusted input crosses a trust boundary; it must reach sinks as data, never as code">
  <defs>
    <marker id="py11q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="135" text-anchor="middle">Untrusted input</text>
  <text class="d-sub" x="105" y="160" text-anchor="middle">forms, files, headers</text>
  <path class="d-edge-dashed" d="M 250 20 L 250 280"/>
  <text class="d-sub" x="250" y="14" text-anchor="middle">trust boundary</text>
  <path class="d-edge" d="M 190 145 L 470 60" marker-end="url(#py11q4-arrow)"/>
  <path class="d-edge" d="M 190 145 L 470 145" marker-end="url(#py11q4-arrow)"/>
  <path class="d-edge" d="M 190 145 L 470 230" marker-end="url(#py11q4-arrow)"/>
  <rect class="d-box" x="480" y="30" width="260" height="60" rx="10"/>
  <text class="d-text" x="610" y="56" text-anchor="middle">Python interpreter</text>
  <text class="d-sub" x="610" y="77" text-anchor="middle">eval, exec, pickle</text>
  <rect class="d-box" x="480" y="115" width="260" height="60" rx="10"/>
  <text class="d-text" x="610" y="141" text-anchor="middle">Other interpreters</text>
  <text class="d-sub" x="610" y="162" text-anchor="middle">SQL, shell, templates</text>
  <rect class="d-box" x="480" y="200" width="260" height="60" rx="10"/>
  <text class="d-text" x="610" y="226" text-anchor="middle">File system</text>
  <text class="d-sub" x="610" y="247" text-anchor="middle">paths, archives</text>
</svg>

The three kinds of destination on the right are where untrusted text does damage if it is treated as code; each section below covers one of them.

## 2. Turning Data Into Python Code

### eval and exec

\`eval("2 + 3")\` runs Python. If the string comes from a user, the user runs Python on your server: \`__import__('os').system(...)\` is one expression away.

📌 **Interview term: ast.literal_eval** — parses a string containing only Python **literals** (numbers, strings, bytes, tuples, lists, dicts, sets, booleans, \`None\`) and never calls anything. Example 1 shows it parsing a nested list and dict and refusing \`__import__('os').getcwd()\` with \`ValueError\`. For data from other programs, \`json.loads\` is usually the better choice.

A popular "fix" is \`eval(text, {"__builtins__": {}})\`. It is not a sandbox. Example 1 evaluates \`().__class__.__base__.__subclasses__()\` with no builtins and still reaches every class loaded in the process, which is the standard first step of an escape. Python has no supported way to run untrusted code safely in-process.

### pickle, marshal and YAML

\`pickle.loads\` can call any function the data names, so unpickling attacker-controlled bytes is remote code execution; the same is true of \`marshal\` and of PyYAML's unsafe loader (\`yaml.unsafe_load\`, or \`yaml.load\` with \`Loader=yaml.UnsafeLoader\`). Use \`json\` for data exchange, or \`yaml.safe_load\`, which only builds plain data. (PyYAML is third-party and was not run here.) This has its own page: [pickling and its risks](/interview-question/what-is-pickling-and-what-are-its-risks), and the JSON alternative is in [converting objects to JSON](/interview-question/how-do-you-convert-between-python-objects-and-json).

### User-controlled format templates

\`str.format\` does more than fill in names: \`{u._config.secret_key}\` follows attributes. If users can supply the *template* (a "customise your email" feature), they can read any attribute reachable from the objects you pass. Example 1 leaks a signing key this way. \`string.Template\` only substitutes \`$name\` placeholders, with no attribute access, and \`"$name.secret_key"\` came out as \`ana.secret_key\`, plain text. f-strings are not affected, because they are written in your source code, not supplied at run time ([f-strings](/interview-question/what-are-f-strings)).

## 3. Injection Into Other Interpreters

📌 **Interview term: Injection** — input that ends up interpreted as code by some interpreter. In Python code the usual interpreters are SQL databases, the shell, template engines and the Python interpreter itself.

### SQL

📌 **Interview term: Parameterised query** — SQL with placeholders (\`?\` in \`sqlite3\`, \`%s\` in most PostgreSQL and MySQL drivers) whose values are sent to the database separately from the statement, so they can never change its structure.

~~~python
# vulnerable
db.execute(f"SELECT name FROM users WHERE name = '{name}'")
# safe
db.execute("SELECT name FROM users WHERE name = ?", (name,))
~~~

In Example 3 the input \`x' OR '1'='1\` turned the f-string query into "every user", returning both \`ana\` and \`root\`; the placeholder version returned no rows, because it looked for a user literally named \`x' OR '1'='1\`. Note that \`sqlite3\`'s \`execute\` refuses to run two statements at once (the \`DROP TABLE\` attempt raised \`ProgrammingError\`), but that is a property of one driver, not a defence. Placeholders cover values only; table and column names cannot be parameters, so pick them from a fixed allow-list.

### The shell

\`subprocess.run(f"convert {filename} out.png", shell=True)\` hands the whole string to \`/bin/sh\`, so a file name like \`a.png; rm -rf ~\` runs a second command. Pass a list (\`["convert", filename, "out.png"]\`) and leave \`shell\` at its default \`False\`. The details, including \`shlex.quote\` and timeouts, are in [running subprocess safely](/interview-question/how-do-you-run-external-commands-with-subprocess-safely).

### The file system: path traversal

📌 **Interview term: Path traversal** — using \`../\` sequences or an absolute path in a user-supplied file name to reach files outside the folder you meant to serve.

Example 2 shows both tricks: \`UPLOADS / "../../../etc/passwd"\` resolves to \`/etc/passwd\`, and joining an absolute path (\`UPLOADS / "/etc/passwd"\`) throws the base away entirely. The fix is to **resolve, then check containment**:

~~~python
target = (UPLOADS / name).resolve()
if not target.is_relative_to(UPLOADS.resolve()):
    raise PermissionError(name)
~~~

\`resolve()\` collapses \`..\` and follows symlinks, so the check runs on the real destination. Checking the string for \`".."\` is not enough.

### Archives

A tar or zip member can be named \`../escaped.txt\` or \`/etc/cron.d/job\`. Extraction filters for \`tarfile\` came with PEP 706 ([PEP 706](https://peps.python.org/pep-0706/)): \`extractall(dest, filter="data")\` rejects members outside the destination, absolute names, device files and unsafe links. In Example 3 the data filter raised \`OutsideDestinationError\` and nothing was written outside the folder. On python3.12, calling \`extractall\` with no filter printed this warning on our run:

~~~text
DeprecationWarning: Python 3.14 will, by default, filter extracted tar archives and reject files or modify their metadata. Use the filter argument to control this behavior.
~~~

As that message says, Python 3.14 made the \`data\` filter the default ([tarfile docs](https://docs.python.org/3/library/tarfile.html#extraction-filters)). Pass \`filter="data"\` explicitly anyway, so the code is safe on every supported version.

## 4. Secrets, Tokens and Passwords

📌 **Interview term: CSPRNG** — a cryptographically secure pseudo-random number generator, whose output cannot be predicted from earlier output. The \`random\` module is **not** one: it is a Mersenne Twister designed for simulations, and Example 2 shows that reseeding reproduces the same "random" values. For tokens, reset links and API keys use \`secrets.token_urlsafe(32)\` (43 characters) or \`secrets.token_hex(16)\` (32 hex characters).

📌 **Interview term: Timing attack** — learning a secret from how long a check takes. A string \`==\` can stop at the first different character, so a guess with a correct prefix takes slightly longer. \`hmac.compare_digest(a, b)\` takes time that does not depend on where the inputs differ; use it to compare tokens, signatures and password hashes.

📌 **Interview term: Key derivation function (KDF)** — a deliberately slow hash for passwords, run with a per-user **salt**. \`hashlib.pbkdf2_hmac\` and \`hashlib.scrypt\` are in the standard library; argon2 and bcrypt are popular third-party choices.

📌 **Interview term: Salt** — random bytes stored next to each hash, so that two users with the same password get different hashes and precomputed tables are useless. Example 2 hashed the same password twice and got two different digests; MD5 of the same password, by contrast, is the same string on every machine in the world (\`51037a4a37730f52c8732586d3aaa316\` for \`same\`), which is exactly what attackers look up.

## 5. Python-Specific Traps

- **\`assert\` is not a check.** Running \`python -O\` removes every \`assert\` statement. Example 1 compiles the same function with and without optimisation: the normal build raised \`AssertionError: admins only\` for a guest, the optimised build returned \`deleted\`. Use \`if not ...: raise PermissionError(...)\`.
- **Untrusted XML.** The standard-library XML parsers have documented weaknesses against malicious documents (entity expansion, the "billion laughs" attack); the Python docs keep a section on [XML security](https://docs.python.org/3/library/xml.html). For untrusted XML, the third-party \`defusedxml\` package is the usual recommendation. We did not run an XML attack here.
- **Huge-number denial of service.** Converting a gigantic decimal string to \`int\` used to take quadratic time; since the fix for CVE-2020-10735, CPython refuses int/str conversions over 4300 digits by default ([LWN](https://lwn.net/Articles/907572/)), so validate input lengths before converting.
- **Debug mode and tracebacks in production.** A web framework debug page can let a visitor run code or read settings; return generic errors and log the details instead.

## 6. Supply Chain and Configuration

📌 **Interview term: Supply-chain attack** — malicious code that arrives through a dependency: a typosquatted name (\`reqeusts\`), a hijacked maintainer account, or an unpinned version that changes under you.

- Pin exact versions with hashes in a lockfile (\`uv.lock\` records a sha256 for every file; see [pyproject.toml and uv workflows](/interview-question/how-do-pyproject-toml-tomllib-and-uv-pyproject-workflows-fit-together)) and review lockfile changes.
- Run a vulnerability scanner such as pip-audit in CI (third-party, not run here).
- Keep TLS verification on: \`requests.get(url, verify=False)\` silently accepts any certificate.
- Keep secrets out of source and logs: read them from the environment or a secret manager, and do not log full request headers.

| Pitfall | Vulnerable | Use instead |
| :--- | :--- | :--- |
| Parsing data | \`eval(text)\` | \`ast.literal_eval(text)\`, \`json.loads(text)\` |
| Deserialising | \`pickle.loads(blob)\`, \`yaml.unsafe_load(s)\` | \`json\`, \`yaml.safe_load(s)\` |
| SQL | f-string query | placeholders: \`execute(sql, params)\` |
| Shell | \`run(cmd_string, shell=True)\` | \`run([prog, arg1, arg2])\` |
| File names | \`base / user_name\` | \`resolve()\` + \`is_relative_to(base)\` |
| Archives | \`extractall(dest)\` | \`extractall(dest, filter="data")\` |
| Tokens | \`random.random()\` | \`secrets.token_urlsafe()\` |
| Comparing secrets | \`a == b\` | \`hmac.compare_digest(a, b)\` |
| Passwords | \`md5(pw)\` / \`sha256(pw)\` | scrypt, PBKDF2, argon2 with a salt |
| Access checks | \`assert user.is_admin\` | \`if not ...: raise PermissionError\` |

## 7. Verified: Running the Code

Examples 1 and 2 were run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1), with identical output. Example 3 was run with python3.12 (it is marked as not runnable in the page) and printed the same on python3.13.

**Example 1 — eval vs literal_eval, the empty-builtins myth, format templates, assert under -O** prints:

~~~text
literal_eval refused: ValueError
[1, 2.5, 'three', {'four': (4,)}]
3
reached object subclasses without builtins: True
Hello ana
Hello s3cr3t-signing-key
Hello ana
Hello ana.secret_key
normal run: admins only
python -O run: deleted
~~~

**Example 2 — path traversal, random vs secrets, compare_digest, salted password hashing** prints:

~~~text
/etc/passwd
/srv/app/uploads/report.pdf
refusing '../../../etc/passwd'
refusing '/etc/passwd'
random repeats after reseeding: True
secrets token length: 43 | hex(16) length: 32
signature ok: True
tampered ok: False
right password: True
wrong password: False
same password, different salt, different hash: True
md5 of a password is the same everywhere: 51037a4a37730f52c8732586d3aaa316
~~~

**Example 3 — SQL injection vs placeholders, and the tarfile data filter (python3.12)** prints:

~~~text
f-string SQL : [('ana',), ('root',)]
placeholder  : []
normal lookup: [('ana',)]
sqlite3 refuses a second statement: ProgrammingError
data filter blocked it: OutsideDestinationError
escaped file written: False
filters available: ['data_filter', 'fully_trusted_filter', 'tar_filter']
~~~

**What the output shows:**

- Every attack worked against the vulnerable version: the f-string query returned both users, the format template printed the signing key, the traversal resolved to \`/etc/passwd\`, and the "removed" assert let a guest delete.
- Every safe version held: \`literal_eval\`, placeholders, \`string.Template\`, the containment check and the tar data filter each refused the same input.

## 8. Edge Cases

- **\`literal_eval\` is not free of risk.** It never runs code, but a deeply nested or enormous literal can still exhaust memory or the stack; limit input size first.
- **\`is_relative_to\` with symlinks.** \`resolve()\` follows a symlink inside the uploads folder that points outside it, so the check correctly refuses it; checking the unresolved path would not.
- **Placeholders do not cover identifiers.** \`ORDER BY ?\` does not work as you hope; map user choices to a fixed set of column names.
- **\`secrets\` does not make a short token safe.** Six digits is a million guesses whatever generator made them; add rate limiting and expiry.

## Common Pitfalls

- **Believing a restricted \`eval\` is safe.** Empty builtins do not stop attribute walks back to \`object\`.
- **Escaping SQL or shell strings by hand.** Use placeholders and argument lists; hand-written escaping always misses a case.
- **Using \`random\` for tokens or passwords.** It is predictable by design; use \`secrets\`.
- **Hashing passwords with a fast hash.** MD5 or SHA-256 alone is fast to brute-force; use a salted KDF.
- **Guarding permissions with \`assert\`.** It disappears under \`-O\`.
- **Extracting archives from users with default settings on older Pythons.** Pass \`filter="data"\` explicitly.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The root cause:</strong> <span style="color:#f0e2c8;">Most bugs are untrusted input reaching something that treats it as code: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle</code>, a SQL string, a shell, a path. The fix is always to pass it as data through an API that keeps code and data apart.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Code execution:</strong> <span style="color:#f0e2c8;">Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">exec</code> input, and do not trust an empty <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__builtins__</code> as a sandbox. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ast.literal_eval</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json</code>. Never <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle.loads</code> or an unsafe YAML loader on untrusted bytes; use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">yaml.safe_load</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Injection:</strong> <span style="color:#f0e2c8;">SQL with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?</code> placeholders, never f-strings; subprocess with an argument list and no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shell=True</code>; user file names resolved and checked with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is_relative_to</code>; archives extracted with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter="data"</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Secrets:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">secrets</code> for tokens, not <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">random</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hmac.compare_digest</code> to compare them; passwords through a slow salted KDF such as scrypt, PBKDF2 or argon2, never MD5 or SHA-256 alone.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Python traps and supply chain:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">assert</code> vanishes under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">python -O</code>, so never use it for access checks. Pin dependencies in a lockfile with hashes, watch for typosquats, run an audit tool, keep TLS verification on and secrets out of logs.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">eval(expr, {"__builtins__": {}})</code> safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Example 1 reaches <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object.__subclasses__()</code> with no builtins at all, through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">().__class__.__base__</code>, and from there an attacker can find classes that open files or run commands. There is no supported sandbox for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">eval</code>; parse data with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ast.literal_eval</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json</code> instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">pickle</code> dangerous but <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">json</code> is not?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Unpickling can call any callable named in the data (via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__reduce__</code>), so loading attacker bytes runs attacker code. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json</code> only builds dicts, lists, strings, numbers, booleans and None. Details in [pickling and its risks](/interview-question/what-is-pickling-and-what-are-its-risks).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">hmac.compare_digest</code> instead of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">==</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">==</code> on strings can return as soon as it finds a different character, so response time leaks how many leading characters of a guess were right. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">compare_digest</code> takes time that does not depend on where the inputs differ, which defeats that timing attack on tokens and signatures.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop path traversal when serving user-named files?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Join with the base folder, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.resolve()</code> to collapse <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">..</code> and symlinks, then check <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">target.is_relative_to(base.resolve())</code>. Rejecting strings containing <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">..</code> is not enough: absolute paths such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/etc/passwd</code> replace the base entirely when joined, as Example 2 shows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changed with <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tarfile</code> extraction?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Extraction filters arrived through PEP 706. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">filter="data"</code> refuses members that escape the target folder, absolute paths, device files and dangerous links. On 3.12, calling <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">extractall</code> without a filter emits a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">DeprecationWarning</code>, and Python 3.14 made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data</code> the default.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Untrusted input** | any data an attacker could influence: request bodies, headers, uploads, queue messages |
| **Trust boundary** | the line where data from outside enters code that trusts it |
| **Injection** | input interpreted as code by some interpreter: Python, SQL, a shell, a template |
| **Parameterised query** | SQL with placeholders whose values are sent separately from the statement |
| **ast.literal_eval** | parses only Python literals (numbers, strings, lists, dicts, ...), never calls anything |
| **Path traversal** | using \`..\` or absolute paths in a file name to reach files outside the intended folder |
| **CSPRNG** | a cryptographically secure random generator; in Python, the \`secrets\` module |
| **Timing attack** | learning a secret from how long a comparison or check takes |
| **Key derivation function (KDF)** | a deliberately slow, salted hash for passwords: scrypt, PBKDF2, argon2 |
| **Salt** | random bytes stored with each password hash so equal passwords hash differently |
| **Supply-chain attack** | malicious code delivered through a dependency, for example a typosquatted package |

---
**Conclusion:** Most Python security bugs are untrusted input reaching something that treats it as code: the Python interpreter (\`eval\`, \`pickle\`, format templates), another interpreter (SQL, the shell) or the file system (paths and archives). The fixes keep code and data apart: \`ast.literal_eval\` or \`json\`, parameterised queries, argument lists without \`shell=True\`, resolved paths checked with \`is_relative_to\`, and \`tarfile\` with \`filter="data"\`. Add \`secrets\` for tokens, \`hmac.compare_digest\` for comparisons, a salted KDF for passwords, real \`if\` checks instead of \`assert\`, and a locked, audited dependency set, and you have covered what a reviewer most often finds.`,
    examples: [
      { label: `eval vs literal_eval, the empty-builtins myth, format templates and assert under -O`, code: `# Code-execution pitfalls: eval on input, format-string templates, assert checks.
import ast

# 1. eval() runs ANY expression. An attacker sends code, not data.
user_input = "__import__('os').getcwd()"
try:
    ast.literal_eval(user_input)
except ValueError as e:
    print("literal_eval refused:", type(e).__name__)
print(ast.literal_eval("[1, 2.5, 'three', {'four': (4,)}]"))
print(ast.literal_eval("{'debug': True, 'retries': 3}")["retries"])  # 3

# eval with empty builtins is NOT a sandbox: objects lead back to everything.
escape = "().__class__.__base__.__subclasses__()"
found = eval(escape, {"__builtins__": {}})
print("reached object subclasses without builtins:", len(found) > 100)

# 2. str.format with a user-controlled TEMPLATE can read attributes.
class Config:
    def __init__(self):
        self.secret_key = "s3cr3t-signing-key"

class User:
    def __init__(self, name, config):
        self.name = name
        self._config = config

user = User("ana", Config())
template = "Hello {u.name}"
print(template.format(u=user))
evil_template = "Hello {u._config.secret_key}"
print(evil_template.format(u=user))

# Safer: string.Template only substitutes names, no attribute access.
from string import Template
print(Template("Hello $name").safe_substitute(name=user.name))
# "$name.secret_key" substitutes $name and leaves ".secret_key" as plain text
print(Template("Hello $name.secret_key").safe_substitute(name=user.name))

# 3. assert is removed under python -O, so it must never guard security.
src = "def delete(user):\\n    assert user == 'admin', 'admins only'\\n    return 'deleted'\\n"
normal, optimised = {}, {}
exec(compile(src, "app", "exec", optimize=0), normal)
exec(compile(src, "app", "exec", optimize=1), optimised)
try:
    normal["delete"]("guest")
except AssertionError as e:
    print("normal run:", e)
print("python -O run:", optimised["delete"]("guest"))` },
      { label: `Path traversal, random vs secrets, compare_digest and salted password hashing`, code: `# Data-handling pitfalls: path traversal, predictable randomness,
# timing-unsafe comparison, and storing passwords.
import hashlib
import hmac
import random
import secrets
from pathlib import Path

# 1. Path traversal: "../" in a user-supplied file name escapes the folder.
UPLOADS = Path("/srv/app/uploads")

def unsafe_path(name):
    return UPLOADS / name

def safe_path(name):
    target = (UPLOADS / name).resolve()
    if not target.is_relative_to(UPLOADS.resolve()):
        raise PermissionError(f"refusing {name!r}")
    return target

print(unsafe_path("../../../etc/passwd").resolve())
print(safe_path("report.pdf"))
for bad in ["../../../etc/passwd", "/etc/passwd"]:
    try:
        safe_path(bad)
    except PermissionError as e:
        print(e)

# 2. random is a predictable PRNG: same seed, same "secret" tokens.
random.seed(1234)
first = [random.getrandbits(32) for _ in range(3)]
random.seed(1234)
print("random repeats after reseeding:", first == [random.getrandbits(32) for _ in range(3)])
token = secrets.token_urlsafe(32)
print("secrets token length:", len(token), "| hex(16) length:", len(secrets.token_hex(16)))

# 3. Compare secrets in constant time: == stops at the first different byte.
expected_sig = hmac.new(b"server-key", b"user=ana", hashlib.sha256).hexdigest()
print("signature ok:", hmac.compare_digest(expected_sig, hmac.new(b"server-key", b"user=ana", hashlib.sha256).hexdigest()))
print("tampered ok:", hmac.compare_digest(expected_sig, hmac.new(b"server-key", b"user=admin", hashlib.sha256).hexdigest()))

# 4. Passwords: a slow, salted key-derivation function, never a bare hash.
def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return salt, digest

def check_password(password, salt, digest):
    return hmac.compare_digest(hash_password(password, salt)[1], digest)

salt, stored = hash_password("correct horse")
print("right password:", check_password("correct horse", salt, stored))
print("wrong password:", check_password("Correct horse", salt, stored))
s1, d1 = hash_password("same")
s2, d2 = hash_password("same")
print("same password, different salt, different hash:", d1 != d2)
print("md5 of a password is the same everywhere:", hashlib.md5(b"same").hexdigest())` },
      { label: `SQL injection vs placeholders and the tarfile data filter (needs sqlite3, CPython 3.12)`, code: `# Injection and archive pitfalls (sqlite3 and the tarfile filters are not
# available in the page runtime, so this one runs on CPython 3.12).
import io
import os
import sqlite3
import tarfile
import tempfile

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE users (name TEXT, is_admin INTEGER)")
db.executemany("INSERT INTO users VALUES (?, ?)", [("ana", 0), ("root", 1)])

def find_unsafe(name):
    sql = f"SELECT name FROM users WHERE name = '{name}'"
    return db.execute(sql).fetchall()

def find_safe(name):
    return db.execute("SELECT name FROM users WHERE name = ?", (name,)).fetchall()

attack = "x' OR '1'='1"
print("f-string SQL :", find_unsafe(attack))
print("placeholder  :", find_safe(attack))
print("normal lookup:", find_safe("ana"))
try:
    find_unsafe("x'; DROP TABLE users; --")
except sqlite3.Error as e:
    print("sqlite3 refuses a second statement:", type(e).__name__)

# A tar archive whose member name climbs out of the destination folder.
buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w") as tar:
    data = b"pwned"
    info = tarfile.TarInfo("../escaped.txt")
    info.size = len(data)
    tar.addfile(info, io.BytesIO(data))

base = tempfile.mkdtemp()
dest = os.path.join(base, "extract")
os.makedirs(dest)
buf.seek(0)
with tarfile.open(fileobj=buf) as tar:
    try:
        tar.extractall(dest, filter="data")
    except tarfile.FilterError as e:
        print("data filter blocked it:", type(e).__name__)
print("escaped file written:", os.path.exists(os.path.join(base, "escaped.txt")))
print("filters available:", sorted(n for n in ("data_filter", "tar_filter", "fully_trusted_filter") if hasattr(tarfile, n)))`, runnable: false, python: `3.12` },
    ],
  },
  {
    title: `How do you run external commands with subprocess safely?`,
    difficulty: `medium`,
    seoDescription: `Run commands with Python subprocess safely: argument lists vs shell=True injection, shlex.quote, check, capture_output, timeout, env and Popen pipelines.`,
    description: `**Question presented to candidate:**
"Your Python service needs to call an external tool, say an image converter, on a file a user uploaded. How do you run it with subprocess, and what can go wrong if you do it carelessly?"

**What a strong answer should cover:**
- Use \`subprocess.run()\` with the command as a **list** of arguments; the default \`shell=False\` starts the program directly, so user text stays one argument and cannot add commands.
- Why \`shell=True\` with string building is command injection (\`name; rm -rf ~\`), and \`shlex.quote\` / \`shlex.join\` for the rare case a shell is unavoidable.
- Robustness flags: \`check=True\` (raise \`CalledProcessError\` on a non-zero exit), \`capture_output=True\` and \`text=True\` (str instead of bytes), \`timeout=\` (the child is killed and \`TimeoutExpired\` raised), plus \`FileNotFoundError\` when the program is missing.
- Control what the child sees: \`input=\`, \`cwd=\`, \`env=\` (merge with \`os.environ\` rather than replacing it), \`shutil.which\` to find the program.
- \`Popen\` for streaming output or building pipelines without a shell, with \`communicate()\` to avoid pipe deadlocks; \`asyncio.create_subprocess_exec\` in async code.
- Least privilege: an allow-list of programs and options, and \`--\` before user-supplied file names so they cannot be read as options.

**Clarifying questions expected:**
- Which parts of the command come from the user, and does the tool accept options that could be abused?
- Do we need the output as a stream, or only at the end?

**Code / implementation expected:** Yes — a \`subprocess.run([...], check=True, capture_output=True, text=True, timeout=...)\` call with its error handling.`,
    answer: `**Target Audience:** Developers who have used \`os.system\` or copied a \`subprocess\` line from the internet, and want to know what each argument does and why it matters.
**Difficulty:** Medium
**Python version:** Example 1 (\`shlex\`) was run on CPython 3.11 (python3.11 and the in-page Pyodide 0.25.1 runtime, CPython 3.11.3). Examples 2 and 3 start real processes, which a browser runtime cannot do, so they are shown with an "Open in playground" button and were run on python3.12 (identical output on python3.13), on Linux.

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact word an interviewer expects. Every output in the **Verified** section was copied from a real run.

## 1. Why This Even Matters — A Story First

You ask an assistant to post a parcel. Option one: you hand them a filled-in shipping form, with a box for the address and a box for the weight. Option two: you shout a sentence across the office, "send the parcel to whatever is written on this sticky note". If the sticky note says "12 High Street, and also give my laptop to the courier", the form-filling assistant writes a very strange address on one label. The shouted-instructions assistant does both things.

\`subprocess\` gives you both options. A **list of arguments** is the form: each value goes in its own box and the program receives it as data. A **command string with \`shell=True\`** is the shouted sentence: a shell reads the whole thing and obeys everything in it, including anything a user slipped into a file name. Calling external programs is common (image tools, git, ffmpeg, compilers), and doing it carelessly is one of the most direct ways to give an attacker a shell on your server.

## 2. Processes, argv and the Shell

📌 **Interview term: Child process** — a separate running program started by your Python process. It has its own memory, its own standard input, output and error streams, and it ends with an exit code.

📌 **Interview term: argv (argument vector)** — the list of strings a program receives when it starts: its own name first, then one string per argument. \`["convert", "my photo.png", "out.png"]\` is an argv with three entries, and the space inside \`my photo.png\` is just a character.

📌 **Interview term: Shell** — a command interpreter such as \`/bin/sh\` or bash. Given a single string, it splits it into words, expands \`$VARIABLES\`, \`~\` and wildcards, and treats \`;\`, \`&&\`, \`|\` and backticks as instructions to run more commands.

\`subprocess.run(["echo", "hi"])\` starts \`echo\` directly with that argv. \`subprocess.run("echo hi", shell=True)\` starts \`/bin/sh -c "echo hi"\` and lets the shell decide what to run.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="With shell=True the string goes to sh, which can start two programs; with a list Python starts exactly one program">
  <defs>
    <marker id="py11q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="30">shell=True with a string</text>
  <rect class="d-box-muted" x="20" y="50" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="85" text-anchor="middle">Python</text>
  <path class="d-edge" d="M 190 80 L 260 80" marker-end="url(#py11q5-arrow)"/>
  <rect class="d-box" x="270" y="50" width="170" height="60" rx="10"/>
  <text class="d-text" x="355" y="78" text-anchor="middle">/bin/sh</text>
  <text class="d-sub" x="355" y="98" text-anchor="middle">parses the string</text>
  <path class="d-edge" d="M 440 70 L 530 50" marker-end="url(#py11q5-arrow)"/>
  <path class="d-edge-accent" d="M 440 92 L 530 112" marker-end="url(#py11q5-arrow)"/>
  <rect class="d-box" x="540" y="24" width="200" height="44" rx="8"/>
  <text class="d-text" x="640" y="51" text-anchor="middle">echo processing</text>
  <rect class="d-box-accent" x="540" y="94" width="200" height="44" rx="8"/>
  <text class="d-text d-accent" x="640" y="121" text-anchor="middle">echo INJECTED</text>
  <text class="d-text" x="20" y="190">a list, shell=False</text>
  <rect class="d-box-muted" x="20" y="210" width="170" height="60" rx="10"/>
  <text class="d-text" x="105" y="245" text-anchor="middle">Python</text>
  <path class="d-edge" d="M 190 240 L 530 240" marker-end="url(#py11q5-arrow)"/>
  <text class="d-sub" x="360" y="226" text-anchor="middle">exec the program directly</text>
  <rect class="d-box" x="540" y="210" width="200" height="60" rx="10"/>
  <text class="d-text" x="640" y="236" text-anchor="middle">echo</text>
  <text class="d-sub" x="640" y="256" text-anchor="middle">one argv with the name</text>
</svg>

In the top path the shell turns one string into two programs; in the bottom path Python hands the exact argument list to the one program, and no shell is involved.

## 3. Command Injection and How a List Prevents It

📌 **Interview term: Command injection** — untrusted text that a shell interprets as extra commands. The classic form is string-building plus \`shell=True\`:

~~~python
# vulnerable: the shell parses the user name
subprocess.run("echo processing " + name, shell=True)
# safe: name is one argument, no shell
subprocess.run(["echo", "processing", name])
~~~

In Example 3, with \`name = "report.txt; echo INJECTED"\`, the \`shell=True\` version printed two lines, \`processing report.txt\` and \`INJECTED\`: the shell ran a second command. The list version printed one line containing the whole name, semicolon and all.

Example 1 (which runs in the page, because it only uses \`shlex\`) shows the same thing without starting anything: tokenising the built command the way a shell does gives \`['convert', 'photo.png', ';', 'rm', '-rf', '~', 'out.png']\`, two commands, while the list keeps the hostile name as the single middle argument.

### When you really need a shell

Sometimes you need shell features (a pipe, a glob, a redirect). Prefer doing those in Python (Example 3 builds a pipeline with two \`Popen\` objects, and \`glob\` or \`pathlib\` replace wildcards). If you must hand a string to a shell:

📌 **Interview term: shlex.quote** — \`shlex.quote(s)\` wraps \`s\` in single quotes (escaping any single quotes inside) so a POSIX shell treats it as exactly one literal word. \`shlex.join(list)\` quotes every element, which is also handy for logging a command in copy-pasteable form. Example 1 shows \`shlex.quote("photo.png; rm -rf ~")\` becoming \`'photo.png; rm -rf ~'\`, and splitting the quoted command gives back exactly the safe list. These functions are for POSIX shells; Windows \`cmd.exe\` has different quoting rules.

### Argument injection: the hole a list does not close

📌 **Interview term: Argument injection** — untrusted text that the *program* reads as an option. If a user names their file \`--output=/etc/passwd\` or \`-rf\`, it is still one argv element, but many tools will parse it as a flag. Defences: put \`--\` before user-supplied file names when the tool supports that convention ("end of options"), prefix relative names with \`./\`, and validate names against an allow-list. And never let the user choose *which* program runs.

## 4. subprocess.run, Argument by Argument

\`subprocess.run\` is the high-level function to reach for first. It starts the child, waits for it, and returns a \`CompletedProcess\`.

📌 **Interview term: CompletedProcess** — the result of \`run()\`: \`args\`, \`returncode\`, and \`stdout\` / \`stderr\` if you captured them.

~~~python
result = subprocess.run(
    ["convert", "--", upload_path, "out.png"],
    capture_output=True,   # collect stdout and stderr
    text=True,             # decode to str instead of bytes
    check=True,            # non-zero exit raises CalledProcessError
    timeout=30,            # kill a hung child and raise TimeoutExpired
)
~~~

\`capture_output\` and \`text\` were added in Python 3.7 ([subprocess docs](https://docs.python.org/3/library/subprocess.html)); on older code you will see \`stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True\`, which mean the same.

📌 **Interview term: Exit code (return code)** — the number a program returns when it ends; 0 means success, anything else is failure by convention. Without \`check=True\`, \`run()\` returns normally even when the program failed: Example 2 shows \`returncode without check: 3\` with no exception. That is the single most common subprocess bug.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 220" role="img" aria-label="What subprocess.run does: start, wait up to the timeout, then return a CompletedProcess or raise">
  <defs>
    <marker id="py11q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="95" y="107" text-anchor="middle">start child</text>
  <text class="d-sub" x="95" y="127" text-anchor="middle">or FileNotFoundError</text>
  <path class="d-edge" d="M 170 110 L 230 110" marker-end="url(#py11q5-arrow2)"/>
  <rect class="d-box" x="240" y="80" width="170" height="60" rx="10"/>
  <text class="d-text" x="325" y="107" text-anchor="middle">communicate</text>
  <text class="d-sub" x="325" y="127" text-anchor="middle">feed input, read pipes</text>
  <path class="d-edge" d="M 410 95 L 520 45" marker-end="url(#py11q5-arrow2)"/>
  <path class="d-edge" d="M 410 110 L 520 110" marker-end="url(#py11q5-arrow2)"/>
  <path class="d-edge-accent" d="M 410 125 L 520 175" marker-end="url(#py11q5-arrow2)"/>
  <rect class="d-box" x="530" y="20" width="210" height="50" rx="8"/>
  <text class="d-text" x="635" y="50" text-anchor="middle">CompletedProcess</text>
  <rect class="d-box" x="530" y="85" width="210" height="50" rx="8"/>
  <text class="d-text" x="635" y="115" text-anchor="middle">CalledProcessError</text>
  <rect class="d-box-accent" x="530" y="150" width="210" height="50" rx="8"/>
  <text class="d-text d-accent" x="635" y="180" text-anchor="middle">kill, TimeoutExpired</text>
</svg>

Each outcome on the right is something your code should handle: a normal result, a failed command (only raised with \`check=True\`), or a child that ran past the timeout and was killed.

The exceptions you should expect:

| Situation | What you get | Useful attributes |
| :--- | :--- | :--- |
| Program not found | \`FileNotFoundError\` | \`filename\` |
| Non-zero exit, \`check=True\` | \`subprocess.CalledProcessError\` | \`returncode\`, \`stdout\`, \`stderr\`, \`cmd\` |
| Ran past \`timeout\` | \`subprocess.TimeoutExpired\` (child killed) | \`timeout\`, \`stdout\`, \`stderr\`, \`cmd\` |
| Non-zero exit, no \`check\` | nothing: check \`returncode\` yourself | |

More inputs worth knowing:

- \`input="..."\` sends data to the child standard input (Example 2 upper-cases a string this way).
- \`cwd="/some/dir"\` runs the child in another folder without changing your own working directory.
- \`env={**os.environ, "MODE": "batch"}\` adds a variable. Passing a dict without \`os.environ\` **replaces** the whole environment, so \`PATH\` and \`HOME\` vanish.
- Without \`text=True\` you get \`bytes\`: Example 2 printed \`b'caf\\xc3\\xa9\\n'\`, the UTF-8 encoding of \`café\`. See [bytes vs str](/interview-question/what-is-the-difference-between-bytes-and-str).
- \`shutil.which("convert")\` returns the full path or \`None\`, which is a clearer check than catching \`FileNotFoundError\` later.

## 5. Popen: Streaming and Pipelines

\`run()\` waits for the child to finish. When you need output while the child is still running, or want to connect processes, use the class underneath it, \`subprocess.Popen\`, which starts the child and returns immediately.

📌 **Interview term: Pipe** — an operating-system channel that carries bytes from one process to another (or to Python). \`stdout=subprocess.PIPE\` makes the child output readable from \`proc.stdout\`.

- **Streaming:** \`for line in proc.stdout:\` reads lines as the child prints them (the child should flush, as Example 3 does with \`flush=True\`). Using \`Popen\` as a context manager waits for the child and closes the pipes at the end of the \`with\` block.
- **Pipelines without a shell:** connect \`p1.stdout\` to \`p2.stdin\`, then close \`p1.stdout\` in the parent so \`p1\` gets a broken-pipe signal if \`p2\` exits early. Example 3 builds \`printf ... | sort\` this way.

📌 **Interview term: Deadlock (pipes)** — pipe buffers are small. If the child fills its stderr pipe while the parent blocks reading stdout, each waits for the other forever. \`proc.communicate()\` reads both pipes (and writes \`input\`) together until the child exits, which is exactly what \`run()\` does internally. Use \`communicate()\` unless you are deliberately streaming one pipe.

Note that \`Popen.communicate(timeout=...)\` raises \`TimeoutExpired\` **without** killing the child; the documented pattern is to catch it, call \`proc.kill()\`, then call \`communicate()\` again. \`run()\` does that for you.

In async code, a blocking \`subprocess.run\` freezes the event loop; use \`asyncio.create_subprocess_exec\` instead ([async/await](/interview-question/how-does-async-await-work-in-python)). For CPU-heavy work in Python itself, a child process is not the right tool at all; see [threading, multiprocessing or asyncio](/interview-question/when-do-you-use-threading-multiprocessing-or-asyncio).

## 6. Verified: Running the Code

Example 1 was run with \`python3.11 main.py\` and through the page runtime (Pyodide 0.25.1), with identical output. Examples 2 and 3 were run with python3.12 on Linux and printed the same on python3.13. They use \`sys.executable\` (the running Python) as the external program where possible, so they work wherever Python does; Example 3 also uses \`echo\`, \`printf\` and \`sort\`, which assume a Unix-like system.

**Example 1 — shlex: how a string becomes argv, injection and quoting** prints:

~~~text
['convert', 'my photo.png', '-resize', '50%', 'out.png']
['grep', '-r', 'two words', 'src']
convert photo.png; rm -rf ~ out.png
['convert', 'photo.png', ';', 'rm', '-rf', '~', 'out.png']
commands the shell would run: 2
['convert', 'photo.png; rm -rf ~', 'out.png']
3
'photo.png; rm -rf ~'
convert 'photo.png; rm -rf ~' out.png
True
convert 'photo.png; rm -rf ~' out.png
echo 'it'"'"'s' '$HOME' 'a b'
'' plain-word_1.txt
~~~

**Example 2 — subprocess.run: check, capture_output, text, timeout, input, env, cwd (python3.12)** prints:

~~~text
CompletedProcess 0 "hello ['a b', 'c']\\n"
returncode without check: 3
CalledProcessError: 3 'boom\\n'
TimeoutExpired: child killed, timeout about 0.5 s
FileNotFoundError: no-such-program-xyz
DATA FROM PYTHON batch True
bytes b'caf\\xc3\\xa9\\n' café
~~~

**Example 3 — shell=True injection vs a list, a pipeline and streaming with Popen (python3.12)** prints:

~~~text
echo found on PATH: True
shell=True : ['processing report.txt', 'INJECTED']
list argv  : ['processing report.txt; echo INJECTED']
quoted     : ['processing report.txt; echo INJECTED']
pipeline   : ['apple', 'fig', 'pear'] exit codes 0 0
got: step 0
got: step 1
got: step 2
streamed child exit code: 0
~~~

**What the output shows:**

- The argument \`"a b"\` arrived in the child as one element of \`sys.argv\`: a list keeps spaces inside arguments without any quoting.
- The child that slept for 30 seconds was killed at the 0.5 second timeout, and the script carried on.
- The environment variable reached the child because the dict was built from \`os.environ\` plus one key.
- Only \`shell=True\` with string building ran the injected command; the list and the quoted string both printed the name literally.

## 7. Edge Cases

- **Windows.** A list is converted to a single command line for \`CreateProcess\` using Microsoft C runtime rules, and \`shell=True\` runs \`cmd.exe\`, whose quoting differs from POSIX; \`shlex.quote\` does not protect \`cmd.exe\`. Batch files (\`.bat\`, \`.cmd\`) are run through \`cmd.exe\` even without \`shell=True\`, so treat their arguments with extra care. We did not run anything on Windows.
- **A string without \`shell=True\`** is treated as the program name on POSIX: \`subprocess.run("ls -l")\` looks for a program literally called \`ls -l\` and raises \`FileNotFoundError\`.
- **Huge output with \`capture_output\`** is held in memory in full; stream it with \`Popen\` or redirect to a file (\`stdout=open(...)\`) instead.
- **\`env\` without \`PATH\`.** Replacing the environment can make the program itself unfindable; pass a full path or merge with \`os.environ\`.
- **Exit codes from signals.** On POSIX a child killed by a signal has a negative \`returncode\` (for example -9 for SIGKILL).

## Common Pitfalls

- **\`shell=True\` with an f-string or concatenation.** The textbook command injection; pass a list.
- **Forgetting \`check=True\`.** Failures pass silently and the next step works on missing output.
- **No \`timeout\`.** One hung tool blocks a worker forever.
- **Replacing the environment by accident.** \`env={"MODE": "x"}\` drops \`PATH\`; use \`{**os.environ, ...}\`.
- **Reading one pipe while the other fills.** Use \`communicate()\` (or \`run()\`), not \`proc.stdout.read()\` with both pipes open.
- **Letting user input pick the program or its options.** Use an allow-list and \`--\` before file names.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The safe default:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subprocess.run(["convert", path, "out.png"], check=True, capture_output=True, text=True, timeout=30)</code>: a list of arguments, no shell. The user path is one argv element, so it cannot add commands.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not \`shell=True\`:</strong> <span style="color:#f0e2c8;">With a string and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shell=True</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/bin/sh</code> parses the whole string, so a name like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x; rm -rf ~</code> becomes a second command. If a shell is unavoidable, wrap every untrusted piece in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shlex.quote</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Failure handling:</strong> <span style="color:#f0e2c8;">Without <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">check=True</code> a non-zero exit is silently ignored; with it you get <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CalledProcessError</code> carrying <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">returncode</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stderr</code>. A missing program is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">FileNotFoundError</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">timeout</code> kills the child and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TimeoutExpired</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Control the child:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input=</code> for stdin, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cwd=</code> for the folder, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">env={**os.environ, ...}</code> to add variables without wiping <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PATH</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text=True</code> gives str instead of bytes; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">shutil.which</code> checks the program exists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Beyond run():</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Popen</code> to stream output line by line or chain processes into a pipeline without a shell, always via <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">communicate()</code> to avoid pipe deadlocks; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">asyncio.create_subprocess_exec</code> in async code.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does using a list make any command safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It stops shell injection, but not argument injection: a file name like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--output=/etc/passwd</code> is still read as an option by many tools. Put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">--</code> before user-supplied paths when the tool supports it, validate names against an allow-list, and only run programs you chose, never one named by the user.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">run</code>, <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">check_output</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">Popen</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run</code> is the general high-level call: it waits and returns a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CompletedProcess</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">check_output</code> is shorthand for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run(..., check=True, stdout=PIPE).stdout</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Popen</code> is the low-level class underneath: it returns immediately and lets you stream, pipe or interact with a running child.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">p.stdout.read()</code> hang, and how does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">communicate()</code> avoid it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pipes have a small OS buffer. If the child fills the stderr pipe while you block reading stdout, both wait on each other forever. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">communicate()</code> reads both pipes concurrently (and writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">input</code>) until the child exits, which is why <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run()</code> uses it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens to the child on timeout?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">run()</code> kills the child, waits for it, and raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TimeoutExpired</code>. With <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Popen.communicate(timeout=...)</code> the child is not killed for you: catch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TimeoutExpired</code>, call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">proc.kill()</code>, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">communicate()</code> again to collect what was left.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you run a command from async code?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await asyncio.create_subprocess_exec("prog", arg, stdout=asyncio.subprocess.PIPE)</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">await proc.communicate()</code>. A blocking <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">subprocess.run</code> inside a coroutine stops the whole event loop. See [how async/await works](/interview-question/how-does-async-await-work-in-python).</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Child process** | the separate program your Python process starts |
| **argv (argument vector)** | the list of strings a program receives: its name, then each argument |
| **Shell** | a command interpreter such as \`/bin/sh\` that parses a command string, with \`;\`, pipes and \`$VARS\` |
| **Command injection** | untrusted text that a shell interprets as extra commands |
| **Argument injection** | untrusted text read by the program as an option, such as a name starting with \`-\` |
| **Exit code (return code)** | the number a program returns; 0 means success |
| **CompletedProcess** | what \`run()\` returns: \`args\`, \`returncode\`, \`stdout\`, \`stderr\` |
| **Pipe** | an OS channel connecting one process output to another input or to Python |
| **Deadlock (pipes)** | parent and child each waiting for the other because a pipe buffer is full |
| **shlex.quote** | wraps a string so a POSIX shell treats it as one literal word |

---
**Conclusion:** Run external programs with \`subprocess.run\` and a list of arguments: the program receives each value as data and no shell is involved, so a hostile file name cannot add commands. Add \`check=True\` so failures raise, \`capture_output=True\` and \`text=True\` to get the output as strings, and a \`timeout\` so a hung child is killed; expect \`FileNotFoundError\`, \`CalledProcessError\` and \`TimeoutExpired\`. Reserve \`shell=True\` for fixed strings, quote any untrusted piece with \`shlex.quote\` if you cannot avoid it, guard against option injection with \`--\` and allow-lists, and reach for \`Popen\` with \`communicate()\` only when you need streaming or pipelines.`,
    examples: [
      { label: `shlex: how a command string becomes argv, injection and quoting (runs in the page)`, code: `# shlex: how a command STRING becomes an argument LIST, and why that matters.
import shlex

# A shell splits on spaces, but respects quotes and backslashes.
print(shlex.split('convert "my photo.png" -resize 50% out.png'))
print(shlex.split("grep -r 'two words' src"))

# A hostile "file name" supplied by a user:
filename = "photo.png; rm -rf ~"

# Pasting it into a command string creates a SECOND command for the shell.
command = "convert " + filename + " out.png"
print(command)
# Tokenise it the way a shell would, with ; as an operator:
tokens = list(shlex.shlex(command, posix=True, punctuation_chars=True))
print(tokens)
print("commands the shell would run:", " ".join(tokens).count(";") + 1)

# As one list element it stays ONE argument; no shell ever parses it.
argv = ["convert", filename, "out.png"]
print(argv)
print(len(argv))  # 3

# If you truly must build a shell string, quote every untrusted piece.
print(shlex.quote(filename))
safe_command = "convert " + shlex.quote(filename) + " out.png"
print(safe_command)
print(shlex.split(safe_command) == argv)  # True

# shlex.join does the quoting for a whole list (handy for logging).
print(shlex.join(argv))
print(shlex.join(["echo", "it's", "$HOME", "a b"]))

# quote() is for POSIX shells only; an empty string must become ''.
print(shlex.quote(""), shlex.quote("plain-word_1.txt"))` },
      { label: `subprocess.run: check, capture_output, text, timeout, input, env and cwd`, code: `# subprocess.run the safe way: a list, check=True, captured text, a timeout.
# (The page runtime cannot start processes, so this runs on CPython 3.12.)
import os
import subprocess
import sys

PY = sys.executable          # use the current Python as a portable "external program"

# 1. The everyday call.
r = subprocess.run(
    [PY, "-c", "import sys; print('hello', sys.argv[1:])", "a b", "c"],
    capture_output=True, text=True, check=True, timeout=10,
)
print(type(r).__name__, r.returncode, repr(r.stdout))

# 2. Non-zero exit: without check=True it is silently ignored.
quiet = subprocess.run([PY, "-c", "import sys; sys.exit(3)"])
print("returncode without check:", quiet.returncode)
try:
    subprocess.run([PY, "-c", "import sys; print('boom', file=sys.stderr); sys.exit(3)"],
                   capture_output=True, text=True, check=True)
except subprocess.CalledProcessError as e:
    print("CalledProcessError:", e.returncode, repr(e.stderr))

# 3. A hung child: timeout kills it and raises.
try:
    subprocess.run([PY, "-c", "import time; time.sleep(30)"], timeout=0.5)
except subprocess.TimeoutExpired as e:
    print("TimeoutExpired: child killed, timeout about", round(e.timeout, 1), "s")

# 4. A program that does not exist raises before anything runs.
try:
    subprocess.run(["no-such-program-xyz", "--help"])
except FileNotFoundError as e:
    print("FileNotFoundError:", e.filename)

# 5. Send input on stdin; control the environment and working directory.
r = subprocess.run(
    [PY, "-c", "import os, sys; print(sys.stdin.read().upper(), os.environ['MODE'], os.getcwd() == os.path.realpath('/'))"],
    input="data from python", capture_output=True, text=True, check=True,
    env={**os.environ, "MODE": "batch"}, cwd="/",
)
print(r.stdout.strip())

# 6. Bytes unless you ask for text.
r = subprocess.run([PY, "-c", "print('caf\\\\u00e9')"], capture_output=True, check=True,
                   env={**os.environ, "PYTHONIOENCODING": "utf-8"})
print(type(r.stdout).__name__, r.stdout, r.stdout.decode("utf-8").strip())`, runnable: false, python: `3.12` },
      { label: `shell=True injection vs an argument list, a pipeline and streaming with Popen`, code: `# shell=True injection, a pipeline without a shell, and streaming with Popen.
# (Needs real processes, so it runs on CPython 3.12, not in the page.)
import shlex
import shutil
import subprocess
import sys

print("echo found on PATH:", shutil.which("echo") is not None)

# A "file name" an attacker typed into a form:
name = "report.txt; echo INJECTED"

# UNSAFE: the whole string goes to /bin/sh, which runs two commands.
unsafe = subprocess.run("echo processing " + name, shell=True,
                        capture_output=True, text=True)
print("shell=True :", unsafe.stdout.splitlines())

# SAFE: a list. The name is one argv element; no shell ever parses it.
safe = subprocess.run(["echo", "processing", name], capture_output=True, text=True)
print("list argv  :", safe.stdout.splitlines())

# If a shell is unavoidable, quote every untrusted piece.
quoted = subprocess.run("echo processing " + shlex.quote(name), shell=True,
                        capture_output=True, text=True)
print("quoted     :", quoted.stdout.splitlines())

# A pipeline (like  printf ... | sort  ) built from two processes, no shell.
p1 = subprocess.Popen(["printf", "pear\\\\napple\\\\nfig\\\\n"], stdout=subprocess.PIPE)
p2 = subprocess.Popen(["sort"], stdin=p1.stdout, stdout=subprocess.PIPE, text=True)
p1.stdout.close()            # so p1 gets SIGPIPE if sort exits early
out, _ = p2.communicate(timeout=10)
p1.wait(timeout=10)
print("pipeline   :", out.split(), "exit codes", p1.returncode, p2.returncode)

# Streaming: read a long-running child line by line as it prints.
code = "import time\\nfor i in range(3):\\n    print('step', i, flush=True)\\n    time.sleep(0.05)"
with subprocess.Popen([sys.executable, "-c", code], stdout=subprocess.PIPE, text=True) as proc:
    for line in proc.stdout:
        print("got:", line.rstrip())
print("streamed child exit code:", proc.returncode)`, runnable: false, python: `3.12` },
    ],
  },
];

export default augments;
