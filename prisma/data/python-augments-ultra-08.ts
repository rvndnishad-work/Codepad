/**
 * PYTHON ULTRA — batch 08: Files, data and stdlib I. Every example was run on
 * python3.11 and through the page's Pyodide 0.25.1 harness by
 * scripts/verify-python-examples.ts; quoted output is that run's output.
 */
import type { PythonUltraAugment } from "./python-augments.types";

const augments: PythonUltraAugment[] = [
  {
    title: "How do you read and write files in Python?",
    difficulty: "easy",
    seoDescription: "Learn open() modes, with blocks, text vs binary mode, encodings, streaming large files, pathlib and atomic writes in Python, with verified examples.",
    description: `**Question presented to candidate:**
"Walk me through how you read and write files in Python. Which modes would you use, how do you make sure the file gets closed, and what goes wrong with encodings and large files?"

**What a strong answer should cover:**
- \`open(path, mode, encoding=...)\` returns a file object; the common modes are \`r\`, \`w\` (truncates), \`a\` (appends), \`x\` (create only, fails if it exists), plus \`b\` for binary and \`+\` for read/write
- \`with open(...) as f:\` closes the file even when an exception is raised, because the file object is a context manager
- Text mode decodes bytes to \`str\` using an encoding and translates newlines; binary mode gives raw \`bytes\`. Always pass \`encoding="utf-8"\` because the default depends on the locale (PEP 686 makes UTF-8 the default only from Python 3.15)
- \`read()\` loads everything; iterating \`for line in f\` streams one line at a time with flat memory; \`readlines()\` builds a list
- \`pathlib.Path\` gives \`read_text\`, \`write_text\`, \`read_bytes\`, \`write_bytes\`, \`mkdir(parents=True)\` and \`/\` path joining
- Safe overwrites: write to a temp file, then \`os.replace\` it over the target

**Clarifying questions expected:**
- Is the data text or binary, and if text, which encoding does it use?
- How large can the file get: does it fit in memory?

**Code / implementation expected:** Yes — a short \`with open(...)\` read/write, ideally showing streaming and an explicit encoding.`,
    answer: `**Target Audience:** Beginners learning Python, and anyone who wants the precise answer an interviewer expects
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (and in the page's Pyodide 3.11 runtime)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Think of a file on disk as a notebook locked in a cupboard. To use it you have to unlock the cupboard (open the file), say what you plan to do (read it, write a fresh page, add to the end), do the work, and then lock the cupboard again (close the file) so nobody else finds it half-written.

Two things go wrong in real programs. People forget to lock the cupboard, so changes never reach the disk or the program runs out of file handles. And people read the notebook in the wrong language: the disk only stores **bytes** (numbers from 0 to 255), and turning those numbers into letters needs an agreed table called an **encoding**. Pick the wrong table and "café" comes back as "cafÃ©".

Python gives you one function, \`open()\`, plus the \`with\` statement and the \`pathlib\` module, to handle both problems cleanly.

## 2. The Core Idea: \`open()\` Returns a File Object

\`open(path, mode, encoding=...)\` asks the operating system for access to a file and hands back a **file object**: a Python object with methods such as \`read\`, \`write\`, \`readline\`, \`seek\` and \`close\`.

📌 **Interview term: File object (file-like object)** — any object with \`read\`/\`write\` methods that behaves like an open file. \`open()\` returns one; \`io.StringIO\` and \`io.BytesIO\` are in-memory ones, which is why many APIs accept "a file-like object" rather than a path.

📌 **Interview term: File mode** — the second argument to \`open()\`, a short string that says what you want to do with the file.

| Mode | Meaning | If the file exists | If it does not |
| :--- | :--- | :--- | :--- |
| \`"r"\` (default) | read text | read from the start | \`FileNotFoundError\` |
| \`"w"\` | write text | **emptied immediately** | created |
| \`"a"\` | append text | writes go to the end | created |
| \`"x"\` | exclusive create | \`FileExistsError\` | created |
| \`"rb"\`, \`"wb"\`, ... | same, but binary | as above | as above |
| \`"r+"\`, \`"w+"\` | read and write | \`r+\` keeps, \`w+\` empties | \`r+\` fails, \`w+\` creates |

The \`"w"\` row is the one that bites: the old contents are gone the moment \`open()\` returns, before you write anything. If you mean "create, but never clobber", use \`"x"\`.

### Closing the file: the \`with\` statement

📌 **Interview term: Context manager** — an object that defines \`__enter__\` and \`__exit__\`, so the \`with\` statement can run setup code on entry and clean-up code on exit, even when an exception escapes the block. File objects are context managers whose \`__exit__\` calls \`close()\`. See [What is a context manager?](/interview-question/what-is-a-context-manager) for how that works in general, and [How do you use multiple context managers at once?](/interview-question/how-do-you-use-multiple-context-managers-at-once) for opening two files in one \`with\`.

~~~python
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("first line\\n")
# here f.closed is True, even if write() had raised
~~~

Closing matters because writes are **buffered**: Python collects them in memory and hands them to the operating system in chunks. Closing (or \`f.flush()\`) pushes the last chunk out.

📌 **Interview term: Buffering** — keeping written data in memory and passing it to the OS in larger blocks, because one system call per character would be very slow. Data that is still in the buffer is not on disk yet.

## 3. The Layers Inside a Text File Object

A text-mode file object is actually a small stack of objects. Your \`str\` goes in at the top; bytes come out at the bottom.

<svg class="iq-diagram" width="100%" viewBox="0 0 1020 156" role="img" aria-label="Layers of a text file object: your str goes to TextIOWrapper, then BufferedWriter, then FileIO and the operating system">
  <defs>
    <marker id="f1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">your code</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">str</text>
  <path class="d-edge-accent" d="M 198 88 L 280 88" marker-end="url(#f1-arrow)"/>
  <text class="d-sub d-accent" x="239" y="72" text-anchor="middle">str</text>
  <rect class="d-box" x="290" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="375" y="72" text-anchor="middle">TextIOWrapper</text>
  <text class="d-sub" x="375" y="96" text-anchor="middle">encode, newlines</text>
  <path class="d-edge-accent" d="M 468 88 L 550 88" marker-end="url(#f1-arrow)"/>
  <text class="d-sub d-accent" x="509" y="72" text-anchor="middle">bytes</text>
  <rect class="d-box" x="560" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="645" y="72" text-anchor="middle">BufferedWriter</text>
  <text class="d-sub" x="645" y="96" text-anchor="middle">collects bytes</text>
  <path class="d-edge-accent" d="M 738 88 L 820 88" marker-end="url(#f1-arrow)"/>
  <text class="d-sub d-accent" x="779" y="72" text-anchor="middle">bytes</text>
  <rect class="d-box-muted" x="830" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="915" y="72" text-anchor="middle">FileIO</text>
  <text class="d-sub" x="915" y="96" text-anchor="middle">system calls</text>
</svg>

When you write, the text layer encodes the \`str\` into bytes and translates \`"\\n"\` into the platform line ending; the buffered layer collects bytes; the raw layer makes the system calls. Reading runs the same stack in reverse. In binary mode (\`"rb"\`, \`"wb"\`) the text layer is simply missing, so you read and write \`bytes\` directly.

📌 **Interview term: Text mode vs binary mode** — text mode (the default) returns and accepts \`str\`, decoding and encoding with an encoding and translating line endings; binary mode (\`b\` in the mode) returns and accepts \`bytes\` and changes nothing. Images, zip files, pickles and anything that is not text must use binary mode. For the full story of the two types, see [What is the difference between bytes and str?](/interview-question/what-is-the-difference-between-bytes-and-str).

📌 **Interview term: Universal newlines** — in text mode, reading turns \`"\\r\\n"\` (Windows) and \`"\\r"\` into \`"\\n"\`, so your code only ever sees \`"\\n"\`. Pass \`newline=""\` to switch the translation off (the \`csv\` module asks for this).

### The encoding argument

If you leave out \`encoding\`, Python uses the locale's preferred encoding. On most Linux and macOS machines that is UTF-8, but on Windows it has historically been a legacy code page, so the same script can read a file correctly on one machine and garble it on another. Python 3.10 added an opt-in \`EncodingWarning\` for exactly this ([PEP 597](https://peps.python.org/pep-0597/)), and [PEP 686](https://peps.python.org/pep-0686/) makes UTF-8 the default from Python 3.15. Until every interpreter you support is that new, write \`encoding="utf-8"\` every time.

📌 **Interview term: Encoding** — the rule that maps characters to bytes and back. UTF-8 is the de facto standard: ASCII characters take one byte, others two to four.

## 4. Reading Strategies

| Call | Returns | Memory | Use when |
| :--- | :--- | :--- | :--- |
| \`f.read()\` | the whole file as one \`str\` | whole file | small files |
| \`f.read(n)\` | up to \`n\` characters (or bytes) | \`n\` | chunked binary copies |
| \`f.readline()\` | one line, with its \`"\\n"\` | one line | reading a header line |
| \`f.readlines()\` | list of lines, each with \`"\\n"\` | whole file | rarely; prefer iteration |
| \`for line in f:\` | one line per loop | one line | **large files** |

📌 **Interview term: Lazy (streaming) iteration** — a file object is its own iterator: \`for line in f\` reads one line at a time from the buffer, so a 10 GB log file can be processed with a few kilobytes of memory. The same idea scales into [generator pipelines](/interview-question/how-do-generator-pipelines-stream-data-lazily).

Remember that lines read from a file still end in \`"\\n"\`; use \`line.rstrip("\\n")\` (not a bare \`strip()\` if leading spaces matter) to drop it.

## 5. \`pathlib\`: the Modern Way to Deal with Paths

\`pathlib.Path\` represents a path as an object. The \`/\` operator joins parts, and small-file helpers save you the \`with\` block.

~~~python
from pathlib import Path

cfg = Path("config") / "app.toml"
cfg.parent.mkdir(parents=True, exist_ok=True)
cfg.write_text("name = 1\\n", encoding="utf-8")
print(cfg.read_text(encoding="utf-8"))
~~~

📌 **Interview term: \`pathlib.Path\`** — an object-oriented path. Useful members: \`.name\`, \`.suffix\`, \`.parent\`, \`.exists()\`, \`.iterdir()\`, \`.glob("*.py")\`, \`.read_text()\`, \`.write_text()\`, \`.read_bytes()\`, \`.write_bytes()\` and \`.open()\`.

\`Path.read_text()\` and \`write_text()\` open, read or write, and close in one call, so they are ideal for small files; for big files use \`path.open()\` inside a \`with\` and iterate.

## 6. Writing Safely: Atomic Replace

If a program crashes halfway through \`open(target, "w")\`, the target is left empty or half-written. The standard fix is to write the new contents to a temporary file in the same folder and then swap it in with \`os.replace(tmp, target)\`. The Python docs state that a successful \`os.replace\` is atomic on POSIX (it is a POSIX requirement for \`rename\`); on Windows the guarantee is less clearly documented, so treat it as "best available" there.

📌 **Interview term: Atomic write** — a write that other readers see either completely or not at all. Write-to-temp-then-rename is the usual way to get one.

## 7. Code Walk-Through

The first example covers modes, \`with\`, reading strategies and the two errors you will meet most often.

~~~python
import errno
import os
import tempfile

# A private scratch folder for this demo
workdir = tempfile.mkdtemp()
path = os.path.join(workdir, "notes.txt")

# "w" creates the file (or empties an existing one) and writes text
with open(path, "w", encoding="utf-8") as f:
    f.write("first line\\n")
    f.write("second line\\n")
    print("inside with, closed?", f.closed)
print("after with, closed?", f.closed)

# "a" appends to the end instead of truncating
with open(path, "a", encoding="utf-8") as f:
    print("third line", file=f)

# Read everything at once
with open(path, encoding="utf-8") as f:
    text = f.read()
print(repr(text))

# Iterate line by line: memory stays flat for huge files
with open(path, encoding="utf-8") as f:
    for number, line in enumerate(f, start=1):
        print(number, line.rstrip("\\n"))

# readlines() vs splitlines(): one keeps the newline, one drops it
with open(path, encoding="utf-8") as f:
    lines = f.readlines()
print(lines[0] == "first line\\n")  # True
print(text.splitlines())  # ['first line', 'second line', 'third line']

# "w" again: the old contents are gone the moment the file opens
with open(path, "w", encoding="utf-8") as f:
    pass
print(os.path.getsize(path))  # 0

# "x" refuses to overwrite: a safe way to create a new file
try:
    open(path, "x")
except FileExistsError as e:
    print("x mode:", type(e).__name__)

# Reading a missing file
try:
    open(os.path.join(workdir, "missing.txt"))
except FileNotFoundError as e:
    print("r mode:", type(e).__name__, e.errno == errno.ENOENT)
~~~

The second shows \`pathlib\`, binary mode, newline translation, \`seek\`/\`tell\`, decoding errors and the atomic replace.

~~~python
import os
import tempfile
from pathlib import Path

base = Path(tempfile.mkdtemp())

# pathlib: one-liners for small files
cfg = base / "config" / "app.txt"
cfg.parent.mkdir(parents=True, exist_ok=True)
written = cfg.write_text("name=café\\n", encoding="utf-8")
print("characters written:", written)
print("bytes on disk:", cfg.stat().st_size)
print(cfg.read_text(encoding="utf-8").strip())  # name=café
print(cfg.name, cfg.suffix, cfg.parent.name)

# Binary mode: bytes in, bytes out, no decoding, no newline translation
raw = cfg.read_bytes()
print(raw)

# Text mode translates line endings on read (universal newlines)
win = base / "windows.txt"
win.write_bytes(b"a\\r\\nb\\r\\n")
with open(win, encoding="utf-8") as f:
    print(repr(f.read()))
with open(win, encoding="utf-8", newline="") as f:
    print(repr(f.read()))

# seek and tell work in bytes; in binary mode you can jump anywhere
with open(cfg, "rb") as f:
    f.seek(5)
    print(f.read(4), f.tell())

# Wrong encoding: the bytes are fine, the decoding is not
try:
    cfg.read_text(encoding="ascii")
except UnicodeDecodeError as e:
    print("ascii cannot decode byte", hex(e.object[e.start]), "at", e.start)
print(cfg.read_text(encoding="ascii", errors="replace").strip())

# Atomic replace: write a temp file, then swap it in with one rename
target = base / "data.txt"
target.write_text("old\\n", encoding="utf-8")
tmp = target.with_suffix(".tmp")
tmp.write_text("new\\n", encoding="utf-8")
os.replace(tmp, target)
print(target.read_text(encoding="utf-8").strip(), tmp.exists())

# Listing a folder: sort it, because directory order is not guaranteed
print(sorted(p.name for p in base.iterdir()))
~~~

Things worth pointing out in the output below:

- \`characters written: 10\` but \`bytes on disk: 11\`: \`write_text\` returns the number of **characters**, while the file holds UTF-8 bytes, and \`é\` takes two of them.
- \`f.seek(5)\` then \`f.read(4)\` in binary mode gives \`b'caf\\xc3'\`: positions are byte offsets, and a byte read can stop in the middle of a character. In text mode you may only \`seek\` to values that \`tell()\` returned earlier.
- \`errors="replace"\` turns each undecodable byte into U+FFFD (shown as \`�\`), so \`é\` (two bytes) becomes two replacement characters.

## 8. Verified: Running the Code

Both examples were run on python3.11 and in the page's Pyodide 0.25.1 runtime with identical output. In Pyodide the files live in an in-memory file system, which is why they also run in the browser.

Example 1 (modes, \`with\`, reading and errors):

~~~text
inside with, closed? False
after with, closed? True
'first line\\nsecond line\\nthird line\\n'
1 first line
2 second line
3 third line
True
['first line', 'second line', 'third line']
0
x mode: FileExistsError
r mode: FileNotFoundError True
~~~

Example 2 (\`pathlib\`, binary mode, newlines, encodings, atomic replace):

~~~text
characters written: 10
bytes on disk: 11
name=café
app.txt .txt config
b'name=caf\\xc3\\xa9\\n'
'a\\nb\\n'
'a\\r\\nb\\r\\n'
b'caf\\xc3' 9
ascii cannot decode byte 0xc3 at 8
name=caf��
new False
['config', 'data.txt', 'windows.txt']
~~~

The missing-file check prints \`e.errno == errno.ENOENT\` rather than the raw number on purpose: CPython on Linux reports \`2\`, while Pyodide's WebAssembly runtime reported \`44\` for the same error in our run, so the symbolic constant is the portable comparison.

## 9. Edge Cases

- **Opening the same path for writing twice** gives two independent buffers; whichever is flushed last wins. Do not do it.
- **\`print(..., file=f)\`** writes \`str(obj)\` plus \`"\\n"\` to a text file, which is handy for logs.
- **Directory order** from \`os.listdir\` or \`Path.iterdir()\` is whatever the file system returns; sort it if the order matters.
- **Large binary copies**: use \`shutil.copyfileobj(src, dst)\` or a \`while chunk := f.read(65536)\` loop instead of reading everything.
- **Permissions and missing folders** raise \`PermissionError\` and \`FileNotFoundError\` (both subclasses of \`OSError\`); catch \`OSError\` to handle every I/O failure in one place. See [How does exception handling work in Python?](/interview-question/how-does-exception-handling-work-in-python).

## Common Pitfalls

- **Opening with \`"w"\` when you meant to append** — the file is emptied as soon as \`open()\` returns, before your first write.
- **Leaving out \`encoding=\`** — the code works on your laptop and garbles text on a machine with a different locale, typically Windows.
- **Calling \`f.read()\` on a multi-gigabyte file** — it loads everything into memory; iterate over the file instead.
- **Forgetting to close (no \`with\`)** — the last buffered writes may never reach the disk if the process dies, and long-running programs leak file handles.
- **Reading binary data in text mode** — decoding errors, or silently changed \`\\r\\n\` bytes that corrupt the file.
- **Checking \`os.path.exists()\` and then opening** — the file can appear or vanish in between; prefer opening and catching the exception, as explained in [What is EAFP vs LBYL in Python?](/interview-question/what-is-eafp-vs-lbyl-in-python), or use mode \`"x"\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The tool:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open(path, mode, encoding="utf-8")</code> returns a file object; I always use it inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code> so it is closed, and its buffer flushed, even if an exception is raised.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The modes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">r</code> reads, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w</code> truncates then writes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">a</code> appends, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">x</code> creates only if the file does not exist; add <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b</code> for binary and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">+</code> for read and write.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Text vs binary:</strong> <span style="color:#f0e2c8;">Text mode decodes bytes to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> and translates newlines; binary mode gives raw <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code>. I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">encoding="utf-8"</code> explicitly because the default depends on the locale until Python 3.15.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Big files:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read()</code> loads everything; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for line in f</code> streams one line at a time with flat memory, so that is what I use for logs and large data.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Modern and safe:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pathlib.Path</code> for paths and small <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read_text</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">write_text</code> calls, and write-to-temp then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">os.replace</code> when a half-written file would be a problem.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you forget to close a file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Buffered writes may never reach the disk if the process dies, and the program leaks file descriptors. CPython usually closes it when the object is garbage collected, but that is an implementation detail, so use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">"w"</code> sometimes lose data?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The file is truncated the moment <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open()</code> returns, before you write anything. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a"</code> to append or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"x"</code> to refuse to overwrite an existing file.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you process a 20 GB log file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Open it and iterate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">for line in f:</code>, keeping only running totals; or read fixed-size chunks with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">f.read(65536)</code> for binary data. Never call <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">read()</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">readlines()</code> on it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">read_text()</code> and <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">open()</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Path.read_text()</code> opens, reads the whole file and closes it in one call, so it suits small files. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">open()</code> gives you a file object for streaming, seeking and partial reads.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">seek(5)</code> on a text file risky?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Positions are byte offsets, and a multi-byte UTF-8 character can start before position 5. In text mode you should only seek to values returned by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tell()</code>; use binary mode for random access.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **File object** | What \`open()\` returns: an object with \`read\`, \`write\`, \`seek\` and \`close\` |
| **File mode** | \`r\`, \`w\`, \`a\`, \`x\`, plus \`b\` (binary) and \`+\` (read and write) |
| **Context manager** | Object used by \`with\`; a file closes itself in \`__exit__\` |
| **Buffering** | Collecting writes in memory before handing them to the OS |
| **Text vs binary mode** | \`str\` with decoding and newline translation, or raw \`bytes\` |
| **Universal newlines** | Text-mode reading turns \`\\r\\n\` and \`\\r\` into \`\\n\` |
| **Encoding** | The rule that maps characters to bytes; use UTF-8 |
| **Lazy iteration** | \`for line in f\` reads one line at a time |
| **\`pathlib.Path\`** | Object-oriented path with read and write helpers |
| **Atomic write** | Write a temp file, then \`os.replace\` it over the target |

**Conclusion:** Reading and writing files in Python comes down to \`open(path, mode, encoding="utf-8")\` inside a \`with\` block: the mode decides whether you read, truncate, append or exclusively create; the \`with\` guarantees the buffered data is flushed and the handle closed; and the explicit encoding keeps text identical on every machine. Iterate over the file for large inputs, use binary mode for anything that is not text, reach for \`pathlib\` for path handling and one-line reads, and use write-then-\`os.replace\` when a half-written file would be a disaster.`,
    examples: [
      {
        label: "Modes, with blocks, reading line by line, and the two common errors",
        code: `import errno
import os
import tempfile

# A private scratch folder for this demo
workdir = tempfile.mkdtemp()
path = os.path.join(workdir, "notes.txt")

# "w" creates the file (or empties an existing one) and writes text
with open(path, "w", encoding="utf-8") as f:
    f.write("first line\\n")
    f.write("second line\\n")
    print("inside with, closed?", f.closed)
print("after with, closed?", f.closed)

# "a" appends to the end instead of truncating
with open(path, "a", encoding="utf-8") as f:
    print("third line", file=f)

# Read everything at once
with open(path, encoding="utf-8") as f:
    text = f.read()
print(repr(text))

# Iterate line by line: memory stays flat for huge files
with open(path, encoding="utf-8") as f:
    for number, line in enumerate(f, start=1):
        print(number, line.rstrip("\\n"))

# readlines() vs splitlines(): one keeps the newline, one drops it
with open(path, encoding="utf-8") as f:
    lines = f.readlines()
print(lines[0] == "first line\\n")  # True
print(text.splitlines())  # ['first line', 'second line', 'third line']

# "w" again: the old contents are gone the moment the file opens
with open(path, "w", encoding="utf-8") as f:
    pass
print(os.path.getsize(path))  # 0

# "x" refuses to overwrite: a safe way to create a new file
try:
    open(path, "x")
except FileExistsError as e:
    print("x mode:", type(e).__name__)

# Reading a missing file
try:
    open(os.path.join(workdir, "missing.txt"))
except FileNotFoundError as e:
    print("r mode:", type(e).__name__, e.errno == errno.ENOENT)`,
      },
      {
        label: "pathlib, binary mode, newlines, encodings and an atomic replace",
        code: `import os
import tempfile
from pathlib import Path

base = Path(tempfile.mkdtemp())

# pathlib: one-liners for small files
cfg = base / "config" / "app.txt"
cfg.parent.mkdir(parents=True, exist_ok=True)
written = cfg.write_text("name=café\\n", encoding="utf-8")
print("characters written:", written)
print("bytes on disk:", cfg.stat().st_size)
print(cfg.read_text(encoding="utf-8").strip())  # name=café
print(cfg.name, cfg.suffix, cfg.parent.name)

# Binary mode: bytes in, bytes out, no decoding, no newline translation
raw = cfg.read_bytes()
print(raw)

# Text mode translates line endings on read (universal newlines)
win = base / "windows.txt"
win.write_bytes(b"a\\r\\nb\\r\\n")
with open(win, encoding="utf-8") as f:
    print(repr(f.read()))
with open(win, encoding="utf-8", newline="") as f:
    print(repr(f.read()))

# seek and tell work in bytes; in binary mode you can jump anywhere
with open(cfg, "rb") as f:
    f.seek(5)
    print(f.read(4), f.tell())

# Wrong encoding: the bytes are fine, the decoding is not
try:
    cfg.read_text(encoding="ascii")
except UnicodeDecodeError as e:
    print("ascii cannot decode byte", hex(e.object[e.start]), "at", e.start)
print(cfg.read_text(encoding="ascii", errors="replace").strip())

# Atomic replace: write a temp file, then swap it in with one rename
target = base / "data.txt"
target.write_text("old\\n", encoding="utf-8")
tmp = target.with_suffix(".tmp")
tmp.write_text("new\\n", encoding="utf-8")
os.replace(tmp, target)
print(target.read_text(encoding="utf-8").strip(), tmp.exists())

# Listing a folder: sort it, because directory order is not guaranteed
print(sorted(p.name for p in base.iterdir()))`,
      },
    ],
  },
  {
    title: "How do you convert between Python objects and JSON?",
    difficulty: "easy",
    seoDescription: "Use json.dumps, loads, dump and load in Python: the type mapping, lossy round trips, default= and object_hook for custom types, and NaN gotchas.",
    description: `**Question presented to candidate:**
"You get JSON from an API and need to send JSON back. How do you convert between JSON and Python objects, and what happens with types JSON does not have, like dates, sets or your own classes?"

**What a strong answer should cover:**
- \`json.dumps\` / \`json.loads\` work with strings; \`json.dump\` / \`json.load\` work with file objects
- The type mapping: object to \`dict\`, array to \`list\`, string to \`str\`, number to \`int\` or \`float\`, \`true\`/\`false\` to \`True\`/\`False\`, \`null\` to \`None\`
- The round trip is lossy: tuples come back as lists, non-string dict keys become strings, and \`set\`, \`datetime\`, \`Decimal\` or custom classes raise \`TypeError\` unless you pass \`default=\`
- Decoding custom types with \`object_hook\` (or \`parse_float=Decimal\` for exact numbers); for real APIs, a validation layer such as dataclasses or Pydantic
- Useful options: \`indent\`, \`sort_keys\`, \`separators\`, \`ensure_ascii=False\`; errors arrive as \`json.JSONDecodeError\`, a \`ValueError\`
- Gotchas: \`NaN\`/\`Infinity\` are emitted by default (not valid JSON; use \`allow_nan=False\`), and duplicate keys silently keep the last value

**Clarifying questions expected:**
- Do the objects contain non-JSON types such as dates, decimals or sets?
- Does the output need to be stable (sorted keys) or human-readable (indented)?

**Code / implementation expected:** Yes — \`dumps\`/\`loads\` plus a \`default=\` function for one custom type.`,
    answer: `**Target Audience:** Beginners learning Python, and developers who want the edge cases an interviewer probes
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11 (and in the page's Pyodide 3.11 runtime)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Imagine sending a piece of flat-pack furniture by post. You cannot post the assembled wardrobe, so you take it apart, pack the pieces in a box with a list of parts, and the person at the other end builds it again from the list.

A Python object lives in your program's memory and cannot travel over a network or sit in a text file as it is. **JSON** is the flat-pack box: a plain-text format with a small, fixed set of piece types (objects, arrays, strings, numbers, booleans and null) that every language understands. Turning your object into JSON text is packing; turning the text back into objects is unpacking. The catch: if your wardrobe has a part the parts list has no word for (a date, a set, your own class), you have to decide how to describe it.

## 2. The Core Idea: Four Functions

📌 **Interview term: Serialisation (encoding)** — turning an in-memory object into a sequence of characters or bytes that can be stored or sent. The reverse is **deserialisation (decoding)**.

The standard-library \`json\` module has four functions, and the only difference is where the text goes:

| Function | Direction | Works with |
| :--- | :--- | :--- |
| \`json.dumps(obj)\` | Python to JSON | returns a \`str\` |
| \`json.loads(text)\` | JSON to Python | takes a \`str\`, \`bytes\` or \`bytearray\` |
| \`json.dump(obj, f)\` | Python to JSON | writes to a text file object |
| \`json.load(f)\` | JSON to Python | reads from a file object |

The trailing **s** stands for **string**. A common way to remember it: \`dumps\` = "dump to a string".

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="json.dumps turns a Python object into JSON text and json.loads turns JSON text back into a Python object">
  <defs>
    <marker id="j1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="110" y="82" text-anchor="middle">Python object</text>
  <text class="d-sub" x="110" y="108" text-anchor="middle">dict list str int None</text>
  <rect class="d-box-accent" x="440" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="530" y="82" text-anchor="middle">JSON text</text>
  <text class="d-sub" x="530" y="108" text-anchor="middle">one str</text>
  <path class="d-edge-accent" d="M 210 72 L 428 72" marker-end="url(#j1-arrow)"/>
  <text class="d-sub d-accent" x="320" y="58" text-anchor="middle">json.dumps</text>
  <path class="d-edge" d="M 430 112 L 212 112" marker-end="url(#j1-arrow)"/>
  <text class="d-sub" x="320" y="134" text-anchor="middle">json.loads</text>
</svg>

Writing to disk is just the file version (see [How do you read and write files in Python?](/interview-question/how-do-you-read-and-write-files-in-python)):

~~~python
with open("order.json", "w", encoding="utf-8") as f:
    json.dump(order, f, indent=2)

with open("order.json", encoding="utf-8") as f:
    order = json.load(f)
~~~

## 3. The Type Mapping

📌 **Interview term: JSON type mapping** — the fixed table the \`json\` module uses to translate between JSON values and Python objects.

| JSON | Python (decoding) | Python values that encode to it |
| :--- | :--- | :--- |
| object \`{}\` | \`dict\` | \`dict\` (keys must be \`str\`, \`int\`, \`float\`, \`bool\` or \`None\`) |
| array \`[]\` | \`list\` | \`list\`, **\`tuple\`** |
| string | \`str\` | \`str\` |
| number (integer) | \`int\` | \`int\` |
| number (with \`.\` or \`e\`) | \`float\` | \`float\` |
| \`true\` / \`false\` | \`True\` / \`False\` | \`True\` / \`False\` |
| \`null\` | \`None\` | \`None\` |

Three things fall out of that table:

1. **The round trip is lossy.** A tuple becomes a list, and an \`int\` key such as \`7\` becomes the string \`"7"\`, so \`json.loads(json.dumps(d)) == d\` can be \`False\`.
2. **Everything else is an error.** \`set\`, \`datetime\`, \`Decimal\`, \`bytes\` and your own classes raise \`TypeError: Object of type X is not JSON serializable\`.
3. **JSON has no comments, no trailing commas and only double-quoted strings.** Python's \`json\` is strict about all three.

## 4. Formatting Options

| Option | Effect | Typical use |
| :--- | :--- | :--- |
| \`indent=2\` | one item per line, nested indentation | config files, logs a human reads |
| \`sort_keys=True\` | keys in sorted order | stable diffs, cache keys, signatures |
| \`separators=(",", ":")\` | no spaces | smallest payload on the wire |
| \`ensure_ascii=False\` | keep non-ASCII characters as they are | readable UTF-8 output |

📌 **Interview term: \`ensure_ascii\`** — on by default, so \`"Zürich"\` is written as \`"Zürich"\`. The output is pure ASCII and safe anywhere; turn it off when you write UTF-8 and want people to read it.

## 5. Custom Types: \`default=\` and \`object_hook\`

📌 **Interview term: \`default=\` hook** — a function you pass to \`dumps\`/\`dump\`. The encoder calls it for every object it does not know how to encode; it must return something JSON can encode (a \`str\`, \`dict\`, \`list\` ...) or raise \`TypeError\`.

📌 **Interview term: \`object_hook\`** — a function you pass to \`loads\`/\`load\`. The decoder calls it with every decoded JSON object (a \`dict\`), innermost first, and uses whatever it returns. It is the natural place to turn a tagged dict back into a \`date\` or a class instance.

<svg class="iq-diagram" width="100%" viewBox="0 0 1020 156" role="img" aria-label="Custom types: the default hook encodes an Event with a date into tagged JSON and object_hook rebuilds the date on load">
  <defs>
    <marker id="j2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">Event object</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">has a date</text>
  <path class="d-edge-accent" d="M 198 88 L 280 88" marker-end="url(#j2-arrow)"/>
  <text class="d-sub d-accent" x="239" y="72" text-anchor="middle">unknown</text>
  <rect class="d-box-accent" x="290" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="375" y="72" text-anchor="middle">default hook</text>
  <text class="d-sub" x="375" y="96" text-anchor="middle">date to tagged dict</text>
  <path class="d-edge-accent" d="M 468 88 L 550 88" marker-end="url(#j2-arrow)"/>
  <text class="d-sub d-accent" x="509" y="72" text-anchor="middle">encoded</text>
  <rect class="d-box-muted" x="560" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="645" y="72" text-anchor="middle">JSON text</text>
  <text class="d-sub" x="645" y="96" text-anchor="middle">plain values</text>
  <path class="d-edge-accent" d="M 738 88 L 820 88" marker-end="url(#j2-arrow)"/>
  <text class="d-sub d-accent" x="779" y="72" text-anchor="middle">decode</text>
  <rect class="d-box-accent" x="830" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="915" y="72" text-anchor="middle">object_hook</text>
  <text class="d-sub" x="915" y="96" text-anchor="middle">tagged dict to date</text>
</svg>

Two more hooks are worth knowing: \`parse_float=Decimal\` keeps every digit of a decimal number instead of rounding it to the nearest binary \`float\` (see [why 0.1 + 0.2 is not 0.3](/interview-question/why-does-0-1-0-2-0-3-in-python-and-when-do-you-use-decimal-or-fraction)), and \`cls=\` lets you subclass \`json.JSONEncoder\` and override its \`default\` method if you prefer a class to a function.

For data that comes from outside your program, conversion is only half the job: you also need to **validate** it (is \`total\` really a number?). [Dataclasses](/interview-question/what-are-dataclasses) plus \`asdict\` cover simple cases; [Pydantic v2](/interview-question/how-does-pydantic-v2-validation-work-basemodel-field-validator-mode) parses and validates JSON straight into typed models.

## 6. Code Walk-Through

The basics: the mapping, the lossy round trip, formatting and errors.

~~~python
import json

order = {
    "id": 42,
    "customer": "Asha",
    "paid": True,
    "coupon": None,
    "total": 19.5,
    "items": ("pen", "ink"),
    7: "an int key",
}

# Python object -> JSON text (serialise)
text = json.dumps(order)
print(text)

# JSON text -> Python object (deserialise)
back = json.loads(text)
print(back)

# The round trip is not lossless: tuples become lists, int keys become str
print(back == order)  # False
print(type(back["items"]).__name__, list(back.keys())[-1] == "7")

# Pretty printing and stable key order (good for diffs and caching keys)
print(json.dumps({"b": 1, "a": [1, 2]}, indent=2, sort_keys=True))

# Compact form for the wire
print(json.dumps({"a": 1, "b": [1, 2]}, separators=(",", ":")))

# Non-ASCII text: escaped by default, kept with ensure_ascii=False
print(json.dumps({"city": "Zürich"}))
print(json.dumps({"city": "Zürich"}, ensure_ascii=False))

# Top-level values do not have to be objects
print(json.loads("[1, 2.5, \\"x\\", true, null]"))

# Bad input raises JSONDecodeError (a subclass of ValueError)
try:
    json.loads('{"a": 1,}')
except json.JSONDecodeError as e:
    print("JSONDecodeError:", e.msg, "line", e.lineno, "col", e.colno)
print(issubclass(json.JSONDecodeError, ValueError))  # True
~~~

Custom types and the gotchas.

~~~python
import json
import math
from dataclasses import dataclass, asdict
from datetime import date

@dataclass
class Event:
    name: str
    day: date
    tags: set

event = Event("launch", date(2026, 3, 14), {"web"})

# Out of the box, json only knows dict, list, tuple, str, int, float, bool, None
try:
    json.dumps(event)
except TypeError as e:
    print("TypeError:", e)

# default= is called for every object json cannot encode
def encode(obj):
    if isinstance(obj, date):
        return {"__date__": obj.isoformat()}
    if isinstance(obj, set):
        return sorted(obj)
    if hasattr(obj, "__dataclass_fields__"):
        return asdict(obj)
    raise TypeError(f"cannot encode {type(obj).__name__}")

text = json.dumps(event, default=encode)
print(text)

# object_hook is called for every decoded JSON object (dict), innermost first
def decode(d):
    if "__date__" in d:
        return date.fromisoformat(d["__date__"])
    return d

data = json.loads(text, object_hook=decode)
print(data["day"], type(data["day"]).__name__)
print(Event(data["name"], data["day"], set(data["tags"])) == event)

# Gotcha 1: NaN and Infinity are written although they are not valid JSON
print(json.dumps([math.nan, math.inf]))
try:
    json.dumps([math.nan], allow_nan=False)
except ValueError as e:
    print("ValueError:", e)

# Gotcha 2: big floats lose precision, Decimal keeps the exact digits
from decimal import Decimal
print(json.loads("0.1000000000000000055511151231257827"))
print(json.loads("0.1000000000000000055511151231257827", parse_float=Decimal))

# Gotcha 3: duplicate keys are not an error, the last one wins
print(json.loads('{"role": "user", "role": "admin"}'))  # {'role': 'admin'}

# Gotcha 4: json.dump writes to a file, json.dumps returns a str
import io
buf = io.StringIO()
json.dump({"ok": True}, buf)
print(buf.getvalue())
~~~

Notes on what the output shows:

- The \`dataclasses.asdict\` call inside \`encode\` returns a dict whose \`day\` is still a \`date\` and whose \`tags\` is still a \`set\`. The encoder then calls \`default\` again for each of them, which is why one small function handles the whole nested object.
- \`json.loads(..., parse_float=Decimal)\` kept all 34 digits, while the plain call rounded to the nearest \`float\`, which prints as \`0.1\`.
- The duplicate \`"role"\` key did not raise; the second value silently replaced the first. That matters if JSON passes through two parsers that disagree on which duplicate wins.

## 7. Verified: Running the Code

Both examples were run on python3.11 and in the page's Pyodide 0.25.1 runtime with identical output.

Example 1 (mapping, round trip, formatting, errors):

~~~text
{"id": 42, "customer": "Asha", "paid": true, "coupon": null, "total": 19.5, "items": ["pen", "ink"], "7": "an int key"}
{'id': 42, 'customer': 'Asha', 'paid': True, 'coupon': None, 'total': 19.5, 'items': ['pen', 'ink'], '7': 'an int key'}
False
list True
{
  "a": [
    1,
    2
  ],
  "b": 1
}
{"a":1,"b":[1,2]}
{"city": "Z\\u00fcrich"}
{"city": "Zürich"}
[1, 2.5, 'x', True, None]
JSONDecodeError: Expecting property name enclosed in double quotes line 1 col 9
True
~~~

Example 2 (\`default=\`, \`object_hook\`, NaN, \`Decimal\`, duplicate keys):

~~~text
TypeError: Object of type Event is not JSON serializable
{"name": "launch", "day": {"__date__": "2026-03-14"}, "tags": ["web"]}
2026-03-14 date
True
[NaN, Infinity]
ValueError: Out of range float values are not JSON compliant
0.1
0.1000000000000000055511151231257827
{'role': 'admin'}
{"ok": true}
~~~

## 8. JSON vs Other Formats

| | JSON | \`pickle\` | TOML |
| :--- | :--- | :--- | :--- |
| Readable by other languages | yes | no (Python only) | yes |
| Human readable | yes | no (binary) | yes, made for config |
| Types | 6 basic kinds | almost any Python object | JSON kinds plus dates and times, but no null |
| Safe to load from strangers | yes (it only builds data) | **no** (can run code) | yes |
| Writing in the standard library | yes | yes | no (\`tomllib\` only reads) |

See [What is pickling and what are its risks?](/interview-question/what-is-pickling-and-what-are-its-risks) and [How do you read TOML with tomllib in Python 3.11+?](/interview-question/how-do-you-read-toml-with-tomllib-in-python-3-11) for the other two columns.

## 9. Edge Cases

- **\`json.loads\` accepts any JSON value at the top level**, not only objects: \`"[1, 2]"\`, \`"3"\` and \`"null"\` are all valid.
- **Big integers are exact** (Python \`int\` has no size limit), but a JavaScript client reading the same JSON loses precision above 2**53; send big IDs as strings.
- **\`bool\` keys**: \`{True: 1}\` encodes as \`{"true": 1}\` and decodes as \`{"true": 1}\`, a string key.
- **\`datetime\` round trips** are your job: pick ISO 8601 (\`isoformat()\` / \`fromisoformat()\`) and be explicit about time zones, as covered in [How do you handle dates, times and time zones in Python?](/interview-question/how-do-you-handle-dates-times-and-time-zones-in-python).
- **Very large documents**: \`json.load\` reads the whole document into memory. For newline-delimited JSON (one object per line), iterate over the file and call \`json.loads\` on each line.

## Common Pitfalls

- **Mixing up \`dump\` and \`dumps\`** — \`json.dump(obj)\` without a file raises \`TypeError\`; \`dumps\` is the one that returns a string.
- **Expecting a perfect round trip** — tuples come back as lists and integer keys come back as strings, so equality checks and lookups like \`d[7]\` fail after decoding.
- **Sending \`NaN\` or \`Infinity\`** — Python writes them by default, but strict parsers in other languages reject them; use \`allow_nan=False\` to fail early.
- **Using \`str(obj)\` or \`repr\` instead of \`json.dumps\`** — single quotes, \`True\` and \`None\` are not JSON.
- **Trusting decoded data without validation** — \`json.loads\` guarantees valid JSON, not the shape your code expects.
- **Losing money precision** — parse prices with \`parse_float=Decimal\` (or send them as strings or integer cents).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The four functions:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json.dumps</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json.loads</code> convert to and from a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json.dump</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json.load</code> do the same with a file object. The s means string.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The mapping:</strong> <span style="color:#f0e2c8;">JSON objects become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>, arrays <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">list</code>, strings <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code>, numbers <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">float</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">true</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">false</code> become <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">True</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> becomes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">None</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. It is lossy:</strong> <span style="color:#f0e2c8;">Tuples come back as lists and non-string keys come back as strings, so a round trip does not always compare equal.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Custom types:</strong> <span style="color:#f0e2c8;">Dates, sets, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal</code> and my own classes raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>, so I pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default=</code> to encode them and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object_hook</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse_float=Decimal</code> to decode; for external input I validate with dataclasses or Pydantic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The gotchas:</strong> <span style="color:#f0e2c8;">Python writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">NaN</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Infinity</code> unless <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">allow_nan=False</code>, duplicate keys silently keep the last value, and bad input raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json.JSONDecodeError</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you serialise a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">datetime</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pass <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default=</code> a function that returns <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">obj.isoformat()</code> (optionally tagged), and rebuild it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datetime.fromisoformat</code> in an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">object_hook</code>. Be explicit about the time zone.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">json.loads(json.dumps(d)) == d</code> sometimes <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">False</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JSON has no tuples and only string keys, so tuples come back as lists and keys such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">7</code> come back as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"7"</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you produce output that is stable for hashing or diffs?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">json.dumps(obj, sort_keys=True, separators=(",", ":"))</code> gives the same text for equal dicts, regardless of insertion order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep prices exact?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Decode with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">parse_float=Decimal</code> so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">19.99</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal</code>, and encode <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Decimal</code> through <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">default=</code> as a string; or send integer cents.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">json.loads</code> safe on untrusted input?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It only builds dicts, lists, strings, numbers, booleans and None, so it cannot run code, unlike <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle.loads</code>. It does not check the shape, so validate the result, and limit input size.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Serialisation** | Turning an object into text or bytes; deserialisation is the reverse |
| **\`dumps\` / \`loads\`** | Convert to and from a \`str\` |
| **\`dump\` / \`load\`** | Convert to and from a file object |
| **JSON type mapping** | The table that pairs JSON values with Python types |
| **\`ensure_ascii\`** | Escape non-ASCII characters (on by default) |
| **\`default=\` hook** | Called for objects the encoder cannot handle |
| **\`object_hook\`** | Called with every decoded JSON object |
| **\`JSONDecodeError\`** | The error for invalid JSON, a subclass of \`ValueError\` |

**Conclusion:** Converting between Python and JSON is \`json.dumps\`/\`json.loads\` for strings and \`json.dump\`/\`json.load\` for files, driven by a small fixed type mapping. A strong answer goes past the four functions: it knows the round trip is lossy (tuples, non-string keys), that dates, sets, decimals and custom classes need a \`default=\` encoder and an \`object_hook\` decoder, that \`indent\`, \`sort_keys\` and \`ensure_ascii\` control the shape of the output, and that real input still needs validation, with \`NaN\` and duplicate keys as the classic traps.`,
    examples: [
      {
        label: "dumps and loads: the type mapping, lossy round trips, formatting and errors",
        code: `import json

order = {
    "id": 42,
    "customer": "Asha",
    "paid": True,
    "coupon": None,
    "total": 19.5,
    "items": ("pen", "ink"),
    7: "an int key",
}

# Python object -> JSON text (serialise)
text = json.dumps(order)
print(text)

# JSON text -> Python object (deserialise)
back = json.loads(text)
print(back)

# The round trip is not lossless: tuples become lists, int keys become str
print(back == order)  # False
print(type(back["items"]).__name__, list(back.keys())[-1] == "7")

# Pretty printing and stable key order (good for diffs and caching keys)
print(json.dumps({"b": 1, "a": [1, 2]}, indent=2, sort_keys=True))

# Compact form for the wire
print(json.dumps({"a": 1, "b": [1, 2]}, separators=(",", ":")))

# Non-ASCII text: escaped by default, kept with ensure_ascii=False
print(json.dumps({"city": "Zürich"}))
print(json.dumps({"city": "Zürich"}, ensure_ascii=False))

# Top-level values do not have to be objects
print(json.loads("[1, 2.5, \\"x\\", true, null]"))

# Bad input raises JSONDecodeError (a subclass of ValueError)
try:
    json.loads('{"a": 1,}')
except json.JSONDecodeError as e:
    print("JSONDecodeError:", e.msg, "line", e.lineno, "col", e.colno)
print(issubclass(json.JSONDecodeError, ValueError))  # True`,
      },
      {
        label: "Custom types with default= and object_hook, plus the NaN, Decimal and duplicate-key gotchas",
        code: `import json
import math
from dataclasses import dataclass, asdict
from datetime import date

@dataclass
class Event:
    name: str
    day: date
    tags: set

event = Event("launch", date(2026, 3, 14), {"web"})

# Out of the box, json only knows dict, list, tuple, str, int, float, bool, None
try:
    json.dumps(event)
except TypeError as e:
    print("TypeError:", e)

# default= is called for every object json cannot encode
def encode(obj):
    if isinstance(obj, date):
        return {"__date__": obj.isoformat()}
    if isinstance(obj, set):
        return sorted(obj)
    if hasattr(obj, "__dataclass_fields__"):
        return asdict(obj)
    raise TypeError(f"cannot encode {type(obj).__name__}")

text = json.dumps(event, default=encode)
print(text)

# object_hook is called for every decoded JSON object (dict), innermost first
def decode(d):
    if "__date__" in d:
        return date.fromisoformat(d["__date__"])
    return d

data = json.loads(text, object_hook=decode)
print(data["day"], type(data["day"]).__name__)
print(Event(data["name"], data["day"], set(data["tags"])) == event)

# Gotcha 1: NaN and Infinity are written although they are not valid JSON
print(json.dumps([math.nan, math.inf]))
try:
    json.dumps([math.nan], allow_nan=False)
except ValueError as e:
    print("ValueError:", e)

# Gotcha 2: big floats lose precision, Decimal keeps the exact digits
from decimal import Decimal
print(json.loads("0.1000000000000000055511151231257827"))
print(json.loads("0.1000000000000000055511151231257827", parse_float=Decimal))

# Gotcha 3: duplicate keys are not an error, the last one wins
print(json.loads('{"role": "user", "role": "admin"}'))  # {'role': 'admin'}

# Gotcha 4: json.dump writes to a file, json.dumps returns a str
import io
buf = io.StringIO()
json.dump({"ok": True}, buf)
print(buf.getvalue())`,
      },
    ],
  },
  {
    title: "What is pickling and what are its risks?",
    difficulty: "medium",
    seoDescription: "How Python pickle serialises object graphs, why pickle.loads on untrusted data runs code via __reduce__, and how HMAC and find_class limit the risk.",
    description: `**Question presented to candidate:**
"What does pickle do in Python, when would you use it, and why do people say you should never unpickle data you did not create yourself?"

**What a strong answer should cover:**
- \`pickle.dumps\`/\`pickle.loads\` (and \`dump\`/\`load\` with binary files) turn almost any Python object graph into bytes and back, keeping types, shared references and cycles
- Classes and functions are stored **by reference** (module and name), not by code, so the same class must be importable when loading; lambdas and local functions cannot be pickled
- The risk: unpickling runs the \`REDUCE\` instruction, which calls whatever callable the stream names (via \`__reduce__\`), so \`pickle.loads\` on untrusted bytes is arbitrary code execution
- Mitigations: do not unpickle untrusted data; sign with HMAC to detect tampering; a restricted \`Unpickler.find_class\` allowlist; prefer JSON or another data-only format across trust boundaries
- Other limits: Python-only, not human-readable, fragile across code and version changes; protocols (default 4 on Python 3.8 to 3.13, 5 from 3.14)
- Where it is used: \`multiprocessing\`, caching, \`copy\`-like deep clones, saving ML models (which is why loading a downloaded model file is a security decision)

**Clarifying questions expected:**
- Where does the pickled data come from, and who could have modified it?
- Does another language or a future version of the code need to read it?

**Code / implementation expected:** Optional — a round trip, and ideally a harmless \`__reduce__\` demo of code running on load.`,
    answer: `**Target Audience:** Python developers who know the basics and want to understand serialisation and its security model
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13 (and in the page's Pyodide 3.11 runtime)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

JSON is like a parts list: it describes data with a handful of plain words. **Pickle** is more like a set of assembly instructions for a robot: "fetch the class \`Account\` from module \`__main__\`, create one, fill in these fields, now fetch the function \`date\` and call it with 2024, 1, 31". That is far more powerful, because it can rebuild nearly any Python object exactly. It is also far more dangerous, because the robot follows **whatever** instructions it is given. If a stranger writes the instruction sheet, one line can be "fetch \`os.system\` and call it with \`rm -rf ~\`".

So the interview answer has two halves: what pickle is good at, and why loading a pickle is the same as running a program written by whoever made it.

## 2. The Core Idea

📌 **Interview term: Pickling** — Python's built-in serialisation: \`pickle.dumps(obj)\` turns an object graph into a \`bytes\` stream, and \`pickle.loads(data)\` rebuilds it. "Unpickling" is the loading half. \`pickle.dump(obj, f)\` and \`pickle.load(f)\` do the same with a file opened in **binary** mode (\`"wb"\` / \`"rb"\`).

What survives a round trip, and what JSON loses (compare [How do you convert between Python objects and JSON?](/interview-question/how-do-you-convert-between-python-objects-and-json)):

| Feature | \`pickle\` | \`json\` |
| :--- | :--- | :--- |
| Instances of your own classes | yes | no, needs a \`default=\` hook |
| \`set\`, \`tuple\`, \`date\`, \`Decimal\`, \`bytes\` | yes, same types back | no, or converted to lists or strings |
| Two names for one object (shared reference) | preserved: still one object | duplicated |
| Cycles (an object that contains itself) | preserved | \`ValueError: Circular reference detected\` |
| Readable by other languages or humans | no | yes |
| Safe to load from an untrusted source | **no** | yes |

📌 **Interview term: Object graph** — an object together with everything it refers to, directly or indirectly. Pickle walks the whole graph and uses a **memo** (a table of objects already written) so that a shared or cyclic reference is written once and then referred back to.

## 3. How a Pickle Stream Works

A pickle is not a data format so much as a tiny **program** for a stack-based virtual machine that lives in the \`pickle\` module. Each byte is an opcode: push a string, build a tuple, look up a global, call it.

📌 **Interview term: Pickle opcodes (the pickle VM)** — the instructions in a pickle stream. \`pickletools.dis(data)\` prints them. The important ones are \`STACK_GLOBAL\` (import \`module.name\` and push it) and \`REDUCE\` (pop a callable and an argument tuple, call it, push the result).

<svg class="iq-diagram" width="100%" viewBox="0 0 1020 156" role="img" aria-label="How unpickling runs code: the stream is read as opcodes, STACK_GLOBAL imports a callable, and REDUCE calls it">
  <defs>
    <marker id="p1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">pickle stream</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">opcodes</text>
  <path class="d-edge-accent" d="M 198 88 L 280 88" marker-end="url(#p1-arrow)"/>
  <text class="d-sub d-accent" x="239" y="72" text-anchor="middle">read</text>
  <rect class="d-box" x="290" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="375" y="72" text-anchor="middle">STACK_GLOBAL</text>
  <text class="d-sub" x="375" y="96" text-anchor="middle">imports a name</text>
  <path class="d-edge-accent" d="M 468 88 L 550 88" marker-end="url(#p1-arrow)"/>
  <text class="d-sub d-accent" x="509" y="72" text-anchor="middle">push</text>
  <rect class="d-box-accent" x="560" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="645" y="72" text-anchor="middle">REDUCE</text>
  <text class="d-sub" x="645" y="96" text-anchor="middle">calls it with args</text>
  <path class="d-edge-accent" d="M 738 88 L 820 88" marker-end="url(#p1-arrow)"/>
  <text class="d-sub d-accent" x="779" y="72" text-anchor="middle">return</text>
  <rect class="d-box" x="830" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="915" y="72" text-anchor="middle">result</text>
  <text class="d-sub" x="915" y="96" text-anchor="middle">or side effect</text>
</svg>

📌 **Interview term: \`__reduce__\`** — the method pickle calls to ask an object "how do I rebuild you?". It returns a callable and the arguments to call it with (optionally plus state). For ordinary classes the default implementation produces "call the class's constructor helper, then restore \`__dict__\`". Any object can return **any** callable.

Two consequences:

1. **Classes and functions are stored by name, not by code.** The stream says \`__main__\` and \`Account\`, but does not contain the class body. Loading needs the same class importable under the same name; rename or move it and old pickles break. Lambdas, nested functions and generators cannot be looked up by name, so they cannot be pickled at all.
2. **Loading executes calls chosen by the author of the stream.** That is the security problem.

## 4. The Risk: Unpickling Is Code Execution

The [pickle documentation](https://docs.python.org/3/library/pickle.html) opens with a blunt warning: the \`pickle\` module is not secure, only unpickle data you trust, because it is possible to construct malicious pickle data which will execute arbitrary code during unpickling. The same page recommends JSON for untrusted data and \`hmac\` signing when integrity matters.

The attack is a few lines. The attacker's class returns a dangerous callable from \`__reduce__\`; you never need the attacker's class to load the result, because the stream only references \`builtins\` or \`os\`, which every Python has. The example below uses the harmless \`print\` to show the mechanism; a real payload names \`os.system\` or \`subprocess.run\`.

~~~python
class Evil:
    def __reduce__(self):
        return (print, ("!!! code ran during pickle.loads !!!",))
~~~

The call happens **inside** \`pickle.loads\`, before your code gets the result back, so no amount of checking the returned object afterwards helps.

📌 **Interview term: Deserialisation vulnerability (insecure deserialisation)** — a security bug class where loading attacker-controlled serialised data makes the program run code or build dangerous objects. Pickle, Java serialisation and YAML's unsafe loaders are the classic examples. Other Python traps of the same family are collected in [What are common Python security pitfalls?](/interview-question/what-are-common-python-security-pitfalls).

Where this bites in practice:

- Caches (Redis, memcached) or cookies holding pickles that an attacker can write to.
- Message queues and RPC between services that pickle their payloads.
- Downloaded **machine-learning model files**: \`torch.save\` checkpoints and joblib \`.pkl\` files are pickle-based. PyTorch 2.6 switched \`torch.load\` to \`weights_only=True\` by default, a restricted unpickler, precisely because a malicious checkpoint can run code ([PyTorch announcement](https://dev-discuss.pytorch.org/t/bc-breaking-change-torch-load-is-being-flipped-to-use-weights-only-true-by-default-in-the-nightlies-after-137602/2573)). Treat model files from the internet as executable.

## 5. Mitigations, From Best to Weakest

<svg class="iq-diagram" width="100%" viewBox="0 0 1020 156" role="img" aria-label="Defence in depth before loading a pickle: verify an HMAC tag, restrict globals with find_class, and only then load">
  <defs>
    <marker id="p2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">incoming bytes</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">from a cache or disk</text>
  <path class="d-edge-accent" d="M 198 88 L 280 88" marker-end="url(#p2-arrow)"/>
  <text class="d-sub d-accent" x="239" y="72" text-anchor="middle">verify</text>
  <rect class="d-box-accent" x="290" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="375" y="72" text-anchor="middle">HMAC check</text>
  <text class="d-sub" x="375" y="96" text-anchor="middle">reject if changed</text>
  <path class="d-edge-accent" d="M 468 88 L 550 88" marker-end="url(#p2-arrow)"/>
  <text class="d-sub d-accent" x="509" y="72" text-anchor="middle">restrict</text>
  <rect class="d-box-accent" x="560" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="645" y="72" text-anchor="middle">find_class</text>
  <text class="d-sub" x="645" y="96" text-anchor="middle">allowlist only</text>
  <path class="d-edge-accent" d="M 738 88 L 820 88" marker-end="url(#p2-arrow)"/>
  <text class="d-sub d-accent" x="779" y="72" text-anchor="middle">build</text>
  <rect class="d-box" x="830" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="915" y="72" text-anchor="middle">load</text>
  <text class="d-sub" x="915" y="96" text-anchor="middle">data you trust</text>
</svg>

1. **Do not unpickle untrusted data.** Across a trust boundary use a data-only format: JSON, MessagePack, Protocol Buffers.
2. **Authenticate the bytes.** If you must store pickles somewhere an attacker could reach, sign them with \`hmac\` and a server-side key, and verify the tag with \`hmac.compare_digest\` **before** calling \`loads\`. This proves you wrote the bytes; it does not make a malicious pickle safe.
3. **Restrict what can be loaded.** Subclass \`pickle.Unpickler\` and override \`find_class(module, name)\` to allow only the classes you expect. Every global lookup goes through it, so \`builtins.print\` or \`os.system\` is refused. This narrows the attack surface but is hard to get completely right, so treat it as defence in depth.

📌 **Interview term: HMAC** — a keyed hash: a short tag computed from the data and a secret key. Without the key nobody can produce a valid tag for changed data, so a matching tag proves the data is unchanged and came from a key holder.

## 6. Protocols and Compatibility

📌 **Interview term: Pickle protocol** — the version of the stream format. Higher protocols are more compact and support more features; older Pythons cannot read newer protocols. \`pickle.HIGHEST_PROTOCOL\` is the newest this interpreter can write, \`pickle.DEFAULT_PROTOCOL\` is what \`dumps\` uses when you do not pass \`protocol=\`.

According to the [pickle documentation](https://docs.python.org/3/library/pickle.html), protocol 5 was added in Python 3.8, protocol 4 is the default on Python 3.8 to 3.13, and protocol 5 became the default in Python 3.14. Our runs on 3.11, 3.12 and 3.13 all printed \`4 5\`. If an older interpreter must read your files, pass an explicit \`protocol=\`.

Even with a matching protocol, pickles are tied to your **code**: renaming a class, moving a module or changing what \`__setstate__\` expects can make old pickles unreadable, which is why pickle is a poor format for long-term storage.

## 7. Controlling What Gets Pickled

Objects that hold an open file, a socket or a lock cannot be pickled directly. Define \`__getstate__\` to return a picklable dict without those fields, and \`__setstate__\` to rebuild them after loading. The \`Conn\` class in the first example does this and comes back with \`socket\` set to \`"reconnected"\`.

Pickle is also how [multiprocessing passes data between processes](/interview-question/how-does-multiprocessing-share-data-between-processes): arguments and results are pickled, so anything you send to a worker must be picklable, and big objects cost time to copy. \`copy.deepcopy\` uses the same \`__reduce__\` machinery (see [What is the difference between shallow and deep copy?](/interview-question/what-is-the-difference-between-shallow-and-deep-copy)).

## 8. Code Walk-Through

What pickle preserves, what it stores, and what it refuses:

~~~python
import pickle
from datetime import date

class Account:
    def __init__(self, owner, opened):
        self.owner = owner
        self.opened = opened
        self.tags = {"vip"}

shared = [1, 2, 3]
alice = Account("alice", date(2024, 1, 31))
data = {"account": alice, "a": shared, "b": shared, "pair": (1, 2)}
data["self"] = data  # a cycle: the dict contains itself

blob = pickle.dumps(data)
print(type(blob).__name__, blob[:2])
restored = pickle.loads(blob)

# Types survive: a real Account, a real date, a set, a tuple
acct = restored["account"]
print(type(acct).__name__, acct.owner, acct.opened, acct.tags)
print(type(restored["pair"]).__name__)  # tuple

# Shared references and cycles survive too (JSON would lose both)
print(restored["a"] is restored["b"])  # True
print(restored["self"] is restored)  # True

# It is a copy, not the same object
print(acct is alice)  # False

# What is in the stream: the class is stored by NAME, not its code
print(b"__main__" in blob, b"Account" in blob, b"__init__" in blob)

# Protocols: the default on 3.8 to 3.13 is 4, the highest is 5
print(pickle.DEFAULT_PROTOCOL, pickle.HIGHEST_PROTOCOL)
print(pickle.dumps(1, protocol=0))

# Things that cannot be pickled: lambdas, local functions, open files, generators
for thing in (lambda x: x, (n for n in range(3))):
    try:
        pickle.dumps(thing)
    except (pickle.PicklingError, TypeError, AttributeError) as e:
        print("cannot pickle", type(thing).__name__, "->", type(e).__name__)

# Custom state control: __getstate__ / __setstate__
class Conn:
    def __init__(self, url):
        self.url = url
        self.socket = object()  # stands in for something unpicklable
    def __getstate__(self):
        state = self.__dict__.copy()
        del state["socket"]
        return state
    def __setstate__(self, state):
        self.__dict__.update(state)
        self.socket = "reconnected"

c = pickle.loads(pickle.dumps(Conn("db://x")))
print(c.url, c.socket)
~~~

The attack and the three mitigations:

~~~python
import hashlib
import hmac
import io
import pickle

# 1. Why pickle.loads on untrusted bytes is code execution.
# __reduce__ tells pickle "to rebuild me, call THIS callable with THESE args".
# An attacker picks the callable. Here it is a harmless print, in a real
# attack it would be os.system or subprocess.run.
class Evil:
    def __reduce__(self):
        return (print, ("!!! code ran during pickle.loads !!!",))

payload = pickle.dumps(Evil())
print("payload is bytes:", isinstance(payload, bytes))
result = pickle.loads(payload)
print("loads returned", result)

# The stream names the callable: builtins.print. pickletools shows the opcodes
import pickletools
pickletools.dis(payload)

# 2. A restricted Unpickler: only allow the globals you expect.
class SafeUnpickler(pickle.Unpickler):
    ALLOWED = {("datetime", "date"), ("builtins", "set")}
    def find_class(self, module, name):
        if (module, name) in self.ALLOWED:
            return super().find_class(module, name)
        raise pickle.UnpicklingError(f"blocked {module}.{name}")

def safe_loads(blob):
    return SafeUnpickler(io.BytesIO(blob)).load()

from datetime import date
print(safe_loads(pickle.dumps({"day": date(2025, 6, 1), "n": [1, 2]})))
try:
    safe_loads(payload)
except pickle.UnpicklingError as e:
    print("UnpicklingError:", e)

# 3. Sign what you store, verify before you load (integrity, not secrecy)
KEY = b"server-side-secret-key"

def sign(blob):
    return hmac.new(KEY, blob, hashlib.sha256).digest() + blob

def verify_and_load(signed):
    tag, blob = signed[:32], signed[32:]
    expected = hmac.new(KEY, blob, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        raise ValueError("signature mismatch: refusing to unpickle")
    return pickle.loads(blob)

good = sign(pickle.dumps({"user": "alice", "role": "user"}))
print(verify_and_load(good))  # {'user': 'alice', 'role': 'user'}
tampered = good[:32] + payload
try:
    verify_and_load(tampered)
except ValueError as e:
    print("ValueError:", e)
~~~

Reading the disassembly in the output: \`SHORT_BINUNICODE 'builtins'\` and \`'print'\` push two strings, \`STACK_GLOBAL\` imports \`builtins.print\`, the argument string is pushed and wrapped in a one-element tuple (\`TUPLE1\`), and \`REDUCE\` calls \`print(...)\`. That \`REDUCE\` is the line that ran during \`pickle.loads\`, which is why the "code ran" message appears before "loads returned None".

## 9. Verified: Running the Code

Both examples were run on python3.11 and in the page's Pyodide 0.25.1 runtime with identical output. The first example was also run on python3.12 and python3.13, which printed the same \`4 5\` protocol line.

Example 1 (round trip, references, protocols, unpicklable objects, \`__getstate__\`):

~~~text
bytes b'\\x80\\x04'
Account alice 2024-01-31 {'vip'}
tuple
True
True
False
True True False
4 5
b'I1\\n.'
cannot pickle function -> PicklingError
cannot pickle generator -> TypeError
db://x reconnected
~~~

Example 2 (\`__reduce__\` payload, \`pickletools.dis\`, restricted unpickler, HMAC):

~~~text
payload is bytes: True
!!! code ran during pickle.loads !!!
loads returned None
    0: \\x80 PROTO      4
    2: \\x95 FRAME      65
   11: \\x8c SHORT_BINUNICODE 'builtins'
   21: \\x94 MEMOIZE    (as 0)
   22: \\x8c SHORT_BINUNICODE 'print'
   29: \\x94 MEMOIZE    (as 1)
   30: \\x93 STACK_GLOBAL
   31: \\x94 MEMOIZE    (as 2)
   32: \\x8c SHORT_BINUNICODE '!!! code ran during pickle.loads !!!'
   70: \\x94 MEMOIZE    (as 3)
   71: \\x85 TUPLE1
   72: \\x94 MEMOIZE    (as 4)
   73: R    REDUCE
   74: \\x94 MEMOIZE    (as 5)
   75: .    STOP
highest protocol among opcodes = 4
{'day': datetime.date(2025, 6, 1), 'n': [1, 2]}
UnpicklingError: blocked builtins.print
{'user': 'alice', 'role': 'user'}
ValueError: signature mismatch: refusing to unpickle
~~~

## Common Pitfalls

- **Unpickling anything from outside your trust boundary** — a cookie, a cache an attacker can write to, an uploaded file or a downloaded model: all are code execution.
- **Validating after loading** — the payload has already run inside \`pickle.loads\`; checks must happen on the bytes (an HMAC tag) before the call.
- **Using pickle for long-term storage** — a class rename or refactor makes old files unloadable; store data in JSON, a database or a versioned schema.
- **Pickling lambdas or local functions for \`multiprocessing\`** — fails with \`PicklingError\`; use module-level functions.
- **Opening the file in text mode** — pickles are bytes; use \`"wb"\` and \`"rb"\`.
- **Assuming the protocol default is fixed** — it changed from 4 to 5 in Python 3.14; set \`protocol=\` if older interpreters read your data.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle.dumps</code>/<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">loads</code> serialise almost any Python object graph to bytes and back, keeping types, shared references and cycles; JSON keeps none of that.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it works:</strong> <span style="color:#f0e2c8;">The stream is a small program of opcodes. Classes are stored by module and name, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__reduce__</code> tells pickle which callable and arguments rebuild each object.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The risk:</strong> <span style="color:#f0e2c8;">Loading runs those calls, so a crafted pickle can name <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">os.system</code>. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle.loads</code> on untrusted bytes is arbitrary code execution, and it happens before you see the result.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Mitigations:</strong> <span style="color:#f0e2c8;">Never unpickle data from outside your trust boundary; use JSON there. If pickles must be stored, sign them with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hmac</code> and verify first; a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">find_class</code> allowlist adds defence in depth.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Other limits:</strong> <span style="color:#f0e2c8;">Python-only, unreadable, tied to your class names and the protocol version (default 4 on 3.8 to 3.13, 5 from 3.14), and lambdas or open files cannot be pickled.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a pickle run code but JSON cannot?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JSON only describes data, so the decoder can only build dicts, lists and scalars. A pickle names callables (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">STACK_GLOBAL</code>) and calls them (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">REDUCE</code>) during loading.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does checking the type of the loaded object make it safe?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The payload runs inside <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pickle.loads</code>, before it returns. Any check has to happen on the bytes, for example by verifying an HMAC tag.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">multiprocessing</code> fail with a lambda?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Arguments are pickled to reach the worker process, and functions are pickled by qualified name. A lambda has no importable name, so pickling raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PicklingError</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pickle an object that holds a socket?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Implement <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__getstate__</code> to return the state without the socket, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">__setstate__</code> to restore it and reconnect after loading.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is it safe to load a model file from the internet?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not if it is pickle-based: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">torch.save</code> and joblib files can run code on load. PyTorch 2.6 made <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">torch.load</code> default to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">weights_only=True</code> for this reason; prefer weights-only formats.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **Pickling** | Python-only serialisation of an object graph to bytes |
| **Object graph** | An object plus everything it refers to |
| **Pickle opcodes** | The instructions of the stream; \`pickletools.dis\` prints them |
| **\`__reduce__\`** | Tells pickle which callable and arguments rebuild an object |
| **Insecure deserialisation** | Loading attacker data that runs code or builds dangerous objects |
| **HMAC** | Keyed hash that proves data was not changed |
| **Pickle protocol** | Stream format version; default 4 on 3.8 to 3.13, 5 from 3.14 |

**Conclusion:** Pickle serialises almost any Python object graph, keeping types, shared references and cycles, which makes it convenient for caches, inter-process communication and quick persistence between runs of your own code. It does so by writing a small program of opcodes that names callables and calls them on load, so \`pickle.loads\` on bytes you did not produce is arbitrary code execution. The strong answer says both halves: use pickle only inside a trust boundary (and sign it if it leaves your process), prefer JSON or another data-only format whenever data crosses one, and remember that pickles are Python-only and tied to your code and protocol version.`,
    examples: [
      {
        label: "What pickle preserves (types, shared references, cycles), protocols, and what it cannot pickle",
        code: `import pickle
from datetime import date

class Account:
    def __init__(self, owner, opened):
        self.owner = owner
        self.opened = opened
        self.tags = {"vip"}

shared = [1, 2, 3]
alice = Account("alice", date(2024, 1, 31))
data = {"account": alice, "a": shared, "b": shared, "pair": (1, 2)}
data["self"] = data  # a cycle: the dict contains itself

blob = pickle.dumps(data)
print(type(blob).__name__, blob[:2])
restored = pickle.loads(blob)

# Types survive: a real Account, a real date, a set, a tuple
acct = restored["account"]
print(type(acct).__name__, acct.owner, acct.opened, acct.tags)
print(type(restored["pair"]).__name__)  # tuple

# Shared references and cycles survive too (JSON would lose both)
print(restored["a"] is restored["b"])  # True
print(restored["self"] is restored)  # True

# It is a copy, not the same object
print(acct is alice)  # False

# What is in the stream: the class is stored by NAME, not its code
print(b"__main__" in blob, b"Account" in blob, b"__init__" in blob)

# Protocols: the default on 3.8 to 3.13 is 4, the highest is 5
print(pickle.DEFAULT_PROTOCOL, pickle.HIGHEST_PROTOCOL)
print(pickle.dumps(1, protocol=0))

# Things that cannot be pickled: lambdas, local functions, open files, generators
for thing in (lambda x: x, (n for n in range(3))):
    try:
        pickle.dumps(thing)
    except (pickle.PicklingError, TypeError, AttributeError) as e:
        print("cannot pickle", type(thing).__name__, "->", type(e).__name__)

# Custom state control: __getstate__ / __setstate__
class Conn:
    def __init__(self, url):
        self.url = url
        self.socket = object()  # stands in for something unpicklable
    def __getstate__(self):
        state = self.__dict__.copy()
        del state["socket"]
        return state
    def __setstate__(self, state):
        self.__dict__.update(state)
        self.socket = "reconnected"

c = pickle.loads(pickle.dumps(Conn("db://x")))
print(c.url, c.socket)`,
      },
      {
        label: "The risk: a __reduce__ payload runs during loads; a restricted Unpickler and HMAC signing",
        code: `import hashlib
import hmac
import io
import pickle

# 1. Why pickle.loads on untrusted bytes is code execution.
# __reduce__ tells pickle "to rebuild me, call THIS callable with THESE args".
# An attacker picks the callable. Here it is a harmless print, in a real
# attack it would be os.system or subprocess.run.
class Evil:
    def __reduce__(self):
        return (print, ("!!! code ran during pickle.loads !!!",))

payload = pickle.dumps(Evil())
print("payload is bytes:", isinstance(payload, bytes))
result = pickle.loads(payload)
print("loads returned", result)

# The stream names the callable: builtins.print. pickletools shows the opcodes
import pickletools
pickletools.dis(payload)

# 2. A restricted Unpickler: only allow the globals you expect.
class SafeUnpickler(pickle.Unpickler):
    ALLOWED = {("datetime", "date"), ("builtins", "set")}
    def find_class(self, module, name):
        if (module, name) in self.ALLOWED:
            return super().find_class(module, name)
        raise pickle.UnpicklingError(f"blocked {module}.{name}")

def safe_loads(blob):
    return SafeUnpickler(io.BytesIO(blob)).load()

from datetime import date
print(safe_loads(pickle.dumps({"day": date(2025, 6, 1), "n": [1, 2]})))
try:
    safe_loads(payload)
except pickle.UnpicklingError as e:
    print("UnpicklingError:", e)

# 3. Sign what you store, verify before you load (integrity, not secrecy)
KEY = b"server-side-secret-key"

def sign(blob):
    return hmac.new(KEY, blob, hashlib.sha256).digest() + blob

def verify_and_load(signed):
    tag, blob = signed[:32], signed[32:]
    expected = hmac.new(KEY, blob, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        raise ValueError("signature mismatch: refusing to unpickle")
    return pickle.loads(blob)

good = sign(pickle.dumps({"user": "alice", "role": "user"}))
print(verify_and_load(good))  # {'user': 'alice', 'role': 'user'}
tampered = good[:32] + payload
try:
    verify_and_load(tampered)
except ValueError as e:
    print("ValueError:", e)`,
      },
    ],
  },
  {
    title: "What is the difference between bytes and str?",
    difficulty: "medium",
    seoDescription: "Python bytes vs str: code points vs raw bytes, encode and decode, UTF-8, UnicodeDecodeError, mojibake, the Unicode sandwich and PEP 393 storage.",
    description: `**Question presented to candidate:**
"In Python 3, what is the difference between \`bytes\` and \`str\`? When do you get each one, how do you convert between them, and what goes wrong when people mix them up?"

**What a strong answer should cover:**
- \`str\` is an immutable sequence of Unicode code points (text); \`bytes\` is an immutable sequence of integers 0 to 255 (binary data)
- \`str.encode(encoding)\` gives \`bytes\`; \`bytes.decode(encoding)\` gives \`str\`; UTF-8 is the usual encoding, and the same text has different byte lengths in different encodings
- Python 3 never converts implicitly: \`"a" + b"a"\` is a \`TypeError\` and \`b"abc" == "abc"\` is \`False\`; indexing \`bytes\` returns an \`int\`
- Errors: \`UnicodeEncodeError\`, \`UnicodeDecodeError\`, and the \`errors=\` argument (\`strict\`, \`replace\`, \`ignore\`); decoding with the wrong codec can silently produce mojibake
- The "Unicode sandwich": decode at the input boundary (files, sockets, HTTP), work with \`str\` inside, encode at the output boundary
- Related: \`bytearray\` (mutable), \`memoryview\` (zero-copy slices), and CPython storing \`str\` at 1, 2 or 4 bytes per character (PEP 393)

**Code / implementation expected:** Optional — an \`encode\`/\`decode\` round trip and one error case.`,
    answer: `**Target Audience:** Python developers who handle files, network data or APIs, explained from zero
**Difficulty:** Medium
**Python version:** Behaviour checked on CPython 3.11 (and in the page's Pyodide 3.11 runtime)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

A piano score and a recording are both "the same song", but they are different things. The score is **meaning**: notes a musician understands. The recording is **storage**: a long list of numbers a machine can save and play. To go from one to the other you need an agreed method (performing and recording), and you can go wrong by using the wrong method in reverse.

In Python, \`str\` is the score: text made of characters. \`bytes\` is the recording: a list of numbers from 0 to 255, which is all that disks and networks can hold. The agreed method that turns one into the other is an **encoding**, almost always UTF-8. Python 3 keeps the two types strictly apart, so you always know which one you are holding, and most text bugs come from crossing the line in the wrong place or with the wrong encoding.

## 2. The Core Idea

📌 **Interview term: \`str\`** — an immutable sequence of Unicode **code points**. A code point is the number Unicode assigns to a character: \`"A"\` is U+0041, \`"é"\` is U+00E9, \`"😀"\` is U+1F600. \`len()\` of a \`str\` counts code points.

📌 **Interview term: \`bytes\`** — an immutable sequence of integers in the range 0 to 255. It has no idea what the numbers mean: they could be UTF-8 text, a JPEG or a pickle. \`len()\` of \`bytes\` counts bytes.

📌 **Interview term: Encoding / decoding** — \`text.encode("utf-8")\` turns a \`str\` into \`bytes\`; \`data.decode("utf-8")\` turns \`bytes\` back into a \`str\`. The codec name says which table to use.

<svg class="iq-diagram" width="100%" viewBox="0 0 640 180" role="img" aria-label="str.encode turns text into bytes and bytes.decode turns bytes back into text">
  <defs>
    <marker id="b1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="110" y="82" text-anchor="middle">str</text>
  <text class="d-sub" x="110" y="108" text-anchor="middle">Unicode code points</text>
  <rect class="d-box" x="440" y="40" width="180" height="100" rx="10"/>
  <text class="d-text" x="530" y="82" text-anchor="middle">bytes</text>
  <text class="d-sub" x="530" y="108" text-anchor="middle">integers 0 to 255</text>
  <path class="d-edge-accent" d="M 210 72 L 428 72" marker-end="url(#b1-arrow)"/>
  <text class="d-sub d-accent" x="320" y="58" text-anchor="middle">encode utf-8</text>
  <path class="d-edge" d="M 430 112 L 212 112" marker-end="url(#b1-arrow)"/>
  <text class="d-sub" x="320" y="134" text-anchor="middle">decode utf-8</text>
</svg>

| | \`str\` | \`bytes\` |
| :--- | :--- | :--- |
| Holds | text (Unicode code points) | raw numbers 0 to 255 |
| Literal | \`"café"\` | \`b"caf\\xc3\\xa9"\` (ASCII characters or \`\\x\` escapes only) |
| \`x[0]\` | a one-character \`str\` | an \`int\` |
| \`len(x)\` | number of code points | number of bytes |
| Convert | \`.encode(encoding)\` | \`.decode(encoding)\` |
| Mutable cousin | none (build a new string, or use \`io.StringIO\`) | \`bytearray\` |
| Comes from | your code, \`open(..., "r")\`, \`json.loads\` | \`open(..., "rb")\`, sockets, \`subprocess\` output, hashing, \`pickle.dumps\` |

Both types share many methods (\`split\`, \`strip\`, \`startswith\`, \`replace\`, \`find\` ...), but each only accepts arguments of its own type: \`b"a,b".split(b",")\`, not \`split(",")\`. The text methods are covered in [What are common useful string methods?](/interview-question/what-are-common-useful-string-methods).

## 3. UTF-8 in One Minute

📌 **Interview term: UTF-8** — the encoding that stores each code point in 1 to 4 bytes: ASCII characters in 1 byte (so ASCII text is valid UTF-8 unchanged), most European and Middle Eastern letters in 2, most other characters, including the euro sign and most Chinese characters, in 3, and emoji in 4. It is the default for source files, JSON and most of the web.

The same text has different bytes in different encodings, as the example shows: \`"naïve café"\` is 12 bytes in UTF-8, 20 in UTF-16-LE and 10 in Latin-1. Latin-1 can only represent the first 256 code points, so encoding \`"€"\` with it fails.

📌 **Interview term: Mojibake** — garbled text produced by decoding bytes with the wrong encoding, for example UTF-8 bytes decoded as Latin-1 giving \`"cafÃ©"\`. Latin-1 maps every byte to some character, so it never raises; the error is silent.

📌 **Interview term: \`errors=\` handler** — what to do with characters or bytes that do not fit: \`"strict"\` (the default, raise), \`"replace"\` (\`?\` when encoding, U+FFFD when decoding), \`"ignore"\` (drop), and \`"backslashreplace"\` (write an escape such as \`\\xe9\`).

## 4. The Unicode Sandwich

📌 **Interview term: Unicode sandwich** — the design rule for text in Python 3: **decode bytes to \`str\` as early as possible** (when data enters your program), **work only with \`str\` inside**, and **encode to bytes as late as possible** (when data leaves).

<svg class="iq-diagram" width="100%" viewBox="0 0 980 156" role="img" aria-label="The Unicode sandwich: bytes in, decode at the edge, str inside the program, encode at the edge, bytes out">
  <defs>
    <marker id="b2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="90" y="72" text-anchor="middle">bytes in</text>
  <text class="d-sub" x="90" y="96" text-anchor="middle">file or socket</text>
  <path class="d-edge-accent" d="M 168 88 L 210 88" marker-end="url(#b2-arrow)"/>
  <rect class="d-box-accent" x="220" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="290" y="72" text-anchor="middle">decode</text>
  <text class="d-sub" x="290" y="96" text-anchor="middle">at the edge</text>
  <path class="d-edge-accent" d="M 368 88 L 410 88" marker-end="url(#b2-arrow)"/>
  <rect class="d-box" x="420" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="490" y="72" text-anchor="middle">str inside</text>
  <text class="d-sub" x="490" y="96" text-anchor="middle">all your logic</text>
  <path class="d-edge-accent" d="M 568 88 L 610 88" marker-end="url(#b2-arrow)"/>
  <rect class="d-box-accent" x="620" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="690" y="72" text-anchor="middle">encode</text>
  <text class="d-sub" x="690" y="96" text-anchor="middle">at the edge</text>
  <path class="d-edge-accent" d="M 768 88 L 810 88" marker-end="url(#b2-arrow)"/>
  <rect class="d-box-muted" x="820" y="40" width="140" height="76" rx="10"/>
  <text class="d-text" x="890" y="72" text-anchor="middle">bytes out</text>
  <text class="d-sub" x="890" y="96" text-anchor="middle">file or socket</text>
</svg>

Most of the time the library does the boundary work for you: \`open(path, encoding="utf-8")\` decodes as you read (see [How do you read and write files in Python?](/interview-question/how-do-you-read-and-write-files-in-python)), and \`json.loads\` accepts UTF-8 \`bytes\` directly. You meet raw \`bytes\` when you use binary files, sockets, \`subprocess\` without \`text=True\`, \`hashlib\` (which only accepts bytes), base64 and binary protocols.

Python 3 refuses to guess at the boundary: \`"id=" + b"42"\` is a \`TypeError\`, and \`b"abc" == "abc"\` is simply \`False\` rather than an error. That strictness is the big change from Python 2, where \`str\` was bytes and mixing it with \`unicode\` silently decoded as ASCII until the first non-ASCII byte crashed in production.

## 5. How CPython Stores a \`str\` (PEP 393)

Since Python 3.3, CPython stores each string in the narrowest fixed width that fits its widest character: 1 byte per character if every code point is below 256, 2 bytes if every one is below 65,536, otherwise 4 bytes ([PEP 393, described in What's New in Python 3.3](https://docs.python.org/3/whatsnew/3.3.html)). This keeps indexing O(1) while making ASCII-heavy text compact.

📌 **Interview term: Flexible string representation (PEP 393)** — CPython's internal 1-, 2- or 4-byte-per-character storage for \`str\`, chosen per string. It is an implementation detail: the encoding you choose for files and the network is unrelated.

The second example measures it: the extra memory for one more character is 1 byte for \`"a"\` and \`"é"\`, 2 for \`"ж"\` and \`"€"\`, 4 for \`"😀"\`, while the UTF-8 byte counts are different (1, 2, 2, 3, 4). And one emoji in a 1,000-character string makes the whole string about four times larger in memory.

## 6. Code Walk-Through

The everyday rules: encoding, indexing, errors, no mixing, literals, \`bytearray\`.

~~~python
text = "naïve café"
data = text.encode("utf-8")

# str is a sequence of characters (code points); bytes is a sequence of 0-255 ints
print(type(text).__name__, len(text))  # str 10
print(type(data).__name__, len(data))  # bytes 12
print(data)

# Indexing: str gives a 1-char str, bytes gives an int
print(repr(text[2]), data[2])
print(list(data[:4]))  # [110, 97, 195, 175]

# encode: str -> bytes, decode: bytes -> str
print(data.decode("utf-8") == text)  # True

# The same text has different bytes in different encodings
for enc in ("utf-8", "utf-16-le", "latin-1"):
    print(enc, len(text.encode(enc)), text.encode(enc)[:6])

# Characters outside an encoding cannot be encoded
try:
    "price: €5".encode("latin-1")
except UnicodeEncodeError as e:
    print("UnicodeEncodeError:", e.reason, repr(e.object[e.start]))
print("price: €5".encode("ascii", errors="replace"))

# Decoding with the wrong codec: error, or worse, silent mojibake
try:
    data.decode("ascii")
except UnicodeDecodeError as e:
    print("UnicodeDecodeError at byte", e.start, hex(data[e.start]))
print(data.decode("latin-1"))

# No implicit mixing in Python 3
try:
    "id=" + b"42"
except TypeError as e:
    print("TypeError:", e)
print("id=" + b"42".decode())  # id=42

# Equality never crosses the types
print(b"abc" == "abc")  # False

# bytes literals only allow ASCII characters directly; other values need escapes
print(b"\\x00\\xff" == bytes([0, 255]))  # True
print(bytes.fromhex("de ad be ef"), b"\\xde\\xad".hex())

# Both are immutable; bytearray is the mutable cousin of bytes
buf = bytearray(b"hello")
buf[0] = ord("J")
print(buf, bytes(buf))
~~~

Under the hood and the Unicode edge cases: PEP 393 widths, code points versus what a person sees, normalisation, \`casefold\` and \`memoryview\`.

~~~python
import sys
import unicodedata

# CPython stores a str with 1, 2 or 4 bytes per character (PEP 393),
# chosen by the widest character in it. Measure the cost of one more char.
def bytes_per_char(ch):
    return sys.getsizeof(ch * 1001) - sys.getsizeof(ch * 1000)

for ch in ("a", "é", "ж", "€", "😀"):
    print(repr(ch), "U+%04X" % ord(ch), "in memory:", bytes_per_char(ch), "in UTF-8:", len(ch.encode("utf-8")))

# One emoji makes the whole string 4 bytes per character
ascii_only = "a" * 1000
with_emoji = "a" * 999 + "😀"
print(len(ascii_only) == len(with_emoji))  # True
print(sys.getsizeof(with_emoji) - sys.getsizeof(ascii_only) > 2900)  # True

# len counts code points, not what a human sees as one character
family = "👨‍👩‍👧"
print(len(family), len(family.encode("utf-8")))

# Two different strings that render the same: precomposed vs combining accent
a = "café"
b = "café"
print(a == b, len(a), len(b))
print(unicodedata.normalize("NFC", a) == unicodedata.normalize("NFC", b))  # True
print(unicodedata.name(b[-1]))

# Case-insensitive matching: casefold beats lower for some scripts
print("Straße".lower() == "STRASSE".lower(), "Straße".casefold() == "STRASSE".casefold())

# A memoryview slices bytes without copying them
blob = bytearray(b"header:payload")
view = memoryview(blob)[7:]
blob[7:10] = b"PAY"
print(bytes(view))
~~~

The family emoji is 5 code points (three people joined by two zero-width joiners), so \`len()\` says 5 although a reader sees one symbol. \`"café"\` written with a precomposed \`é\` and with \`e\` plus a combining accent look identical but compare unequal until both are normalised to NFC.

📌 **Interview term: Unicode normalisation** — converting text to a canonical form (\`unicodedata.normalize("NFC", s)\`) so that different code-point sequences for the same visible text compare equal. Normalise user input before comparing or using it as a key.

📌 **Interview term: \`memoryview\`** — a view onto the memory of a \`bytes\`-like object. Slicing it does not copy, and when the underlying object is a \`bytearray\`, changes show through the view, as the last line of the output shows.

## 7. Verified: Running the Code

Both examples were run on python3.11 and in the page's Pyodide 0.25.1 runtime with identical output. Absolute \`sys.getsizeof\` values differ between a 64-bit CPython and the 32-bit WebAssembly build, so the example prints only differences, which matched on both.

Example 1 (\`encode\`/\`decode\`, indexing, errors, mixing, literals):

~~~text
str 10
bytes 12
b'na\\xc3\\xafve caf\\xc3\\xa9'
'ï' 195
[110, 97, 195, 175]
True
utf-8 12 b'na\\xc3\\xafve'
utf-16-le 20 b'n\\x00a\\x00\\xef\\x00'
latin-1 10 b'na\\xefve '
UnicodeEncodeError: ordinal not in range(256) '€'
b'price: ?5'
UnicodeDecodeError at byte 2 0xc3
naÃ¯ve cafÃ©
TypeError: can only concatenate str (not "bytes") to str
id=42
False
True
b'\\xde\\xad\\xbe\\xef' dead
bytearray(b'Jello') b'Jello'
~~~

Example 2 (PEP 393 widths, code points, normalisation, \`memoryview\`):

~~~text
'a' U+0061 in memory: 1 in UTF-8: 1
'é' U+00E9 in memory: 1 in UTF-8: 2
'ж' U+0436 in memory: 2 in UTF-8: 2
'€' U+20AC in memory: 2 in UTF-8: 3
'😀' U+1F600 in memory: 4 in UTF-8: 4
True
True
5 18
False 4 5
True
COMBINING ACUTE ACCENT
False True
b'PAYload'
~~~

## 8. Edge Cases

- **\`bytes(5)\` is five zero bytes**, not \`b"5"\`. Use \`str(5).encode()\` or \`b"%d" % 5\`.
- **Iterating over \`bytes\` yields \`int\`s**; slicing (\`data[0:1]\`) yields \`bytes\`.
- **\`str(b"abc")\` is \`"b'abc'"\`**, the repr, not a decoded string; always call \`.decode()\`.
- **A chunk boundary can split a character**: decoding each network or file chunk separately fails on multi-byte characters. Use \`codecs.getincrementaldecoder("utf-8")()\` or decode once at the end.
- **A UTF-8 byte order mark** (\`\\xef\\xbb\\xbf\`) at the start of files from some Windows tools ends up as \`"﻿"\` in your text; open such files with \`encoding="utf-8-sig"\`.

## Common Pitfalls

- **Calling \`str()\` on bytes to "convert" them** — you get the repr, \`"b'...'"\`, with quotes and escapes.
- **Decoding with the wrong codec** — Latin-1 never fails, so UTF-8 data turns into mojibake silently; use the encoding the data was written with.
- **Encoding and decoding in the middle of the program** — keep \`str\` inside and convert only at the edges (the Unicode sandwich).
- **Assuming \`len()\` is the byte size or the number of visible characters** — it is code points for \`str\`; byte length needs \`len(s.encode("utf-8"))\`.
- **Comparing or hashing un-normalised user text** — visually identical strings can differ; normalise to NFC, and use \`casefold()\` for case-insensitive matching.
- **Passing \`str\` to APIs that need bytes** (\`hashlib\`, \`socket.send\`, binary files) — \`TypeError\`; encode first.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The distinction:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> is text, an immutable sequence of Unicode code points; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code> is an immutable sequence of integers 0 to 255, raw data with no meaning attached.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The bridge:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text.encode("utf-8")</code> gives bytes and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data.decode("utf-8")</code> gives text; the same text has different bytes in different encodings, and UTF-8 uses 1 to 4 bytes per character.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. No mixing:</strong> <span style="color:#f0e2c8;">Python 3 never converts implicitly: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">"a" + b"a"</code> is a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">b"a" == "a"</code> is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">False</code>, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">data[0]</code> on bytes is an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">int</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Failure modes:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UnicodeEncodeError</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UnicodeDecodeError</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errors=</code> to choose strict, replace or ignore; decoding with the wrong codec, such as Latin-1, can silently give mojibake.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The design rule:</strong> <span style="color:#f0e2c8;">The Unicode sandwich: decode at the input boundary, keep <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> inside, encode at the output. Internally CPython stores <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> at 1, 2 or 4 bytes per character (PEP 393).</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">len("café")</code> differ from <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">len("café".encode())</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">len</code> of a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">str</code> counts code points (4); the UTF-8 encoding needs two bytes for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">é</code>, so the bytes are 5 long.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">You get <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">UnicodeDecodeError: invalid start byte</code>. What do you do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Find out the real encoding of the source (headers, file metadata, the producer) and decode with it. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">errors="replace"</code> hides the symptom; Latin-1 hides it silently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">bytearray</code> useful?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you build or patch binary data in place, for example assembling a packet, because <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">bytes</code> is immutable and every change would copy it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can two strings that look the same compare unequal?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They can use different code points, such as a precomposed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">é</code> versus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">e</code> plus a combining accent. Normalise both with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">unicodedata.normalize("NFC", s)</code> before comparing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you decode a stream that arrives in chunks?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use an incremental decoder from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">codecs.getincrementaldecoder("utf-8")()</code>, which keeps a partial multi-byte character until the next chunk, or decode only after joining the chunks.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **\`str\`** | Immutable sequence of Unicode code points: text |
| **\`bytes\`** | Immutable sequence of integers 0 to 255: binary data |
| **Code point** | The number Unicode gives a character, such as U+00E9 |
| **Encoding / decoding** | \`str\` to \`bytes\` with \`.encode()\`, back with \`.decode()\` |
| **UTF-8** | 1 to 4 bytes per code point; ASCII unchanged |
| **Mojibake** | Garbled text from decoding with the wrong encoding |
| **\`errors=\` handler** | \`strict\`, \`replace\`, \`ignore\`, \`backslashreplace\` |
| **Unicode sandwich** | Decode at input, \`str\` inside, encode at output |
| **PEP 393 representation** | CPython stores \`str\` at 1, 2 or 4 bytes per character |
| **Unicode normalisation** | Canonical form so equal-looking text compares equal |
| **\`memoryview\`** | Zero-copy view onto bytes-like memory |

**Conclusion:** \`str\` is text, a sequence of Unicode code points, and \`bytes\` is storage, a sequence of numbers from 0 to 255; an encoding such as UTF-8 is the only bridge, crossed with \`.encode()\` and \`.decode()\`. Python 3 never mixes the two implicitly, which turns Python 2's silent bugs into immediate \`TypeError\`s and leaves two real failure modes: the wrong codec (an error, or silent mojibake) and converting in the wrong place. Decode at the input boundary, work in \`str\`, encode at the output, and know that \`len()\`, normalisation and CPython's 1-, 2- or 4-byte storage all count code points rather than bytes or visible characters.`,
    examples: [
      {
        label: "encode and decode, indexing, codecs, errors and why Python 3 refuses to mix the types",
        code: `text = "naïve café"
data = text.encode("utf-8")

# str is a sequence of characters (code points); bytes is a sequence of 0-255 ints
print(type(text).__name__, len(text))  # str 10
print(type(data).__name__, len(data))  # bytes 12
print(data)

# Indexing: str gives a 1-char str, bytes gives an int
print(repr(text[2]), data[2])
print(list(data[:4]))  # [110, 97, 195, 175]

# encode: str -> bytes, decode: bytes -> str
print(data.decode("utf-8") == text)  # True

# The same text has different bytes in different encodings
for enc in ("utf-8", "utf-16-le", "latin-1"):
    print(enc, len(text.encode(enc)), text.encode(enc)[:6])

# Characters outside an encoding cannot be encoded
try:
    "price: €5".encode("latin-1")
except UnicodeEncodeError as e:
    print("UnicodeEncodeError:", e.reason, repr(e.object[e.start]))
print("price: €5".encode("ascii", errors="replace"))

# Decoding with the wrong codec: error, or worse, silent mojibake
try:
    data.decode("ascii")
except UnicodeDecodeError as e:
    print("UnicodeDecodeError at byte", e.start, hex(data[e.start]))
print(data.decode("latin-1"))

# No implicit mixing in Python 3
try:
    "id=" + b"42"
except TypeError as e:
    print("TypeError:", e)
print("id=" + b"42".decode())  # id=42

# Equality never crosses the types
print(b"abc" == "abc")  # False

# bytes literals only allow ASCII characters directly; other values need escapes
print(b"\\x00\\xff" == bytes([0, 255]))  # True
print(bytes.fromhex("de ad be ef"), b"\\xde\\xad".hex())

# Both are immutable; bytearray is the mutable cousin of bytes
buf = bytearray(b"hello")
buf[0] = ord("J")
print(buf, bytes(buf))`,
      },
      {
        label: "Under the hood: PEP 393 storage widths, code points vs visible characters, normalisation, memoryview",
        code: `import sys
import unicodedata

# CPython stores a str with 1, 2 or 4 bytes per character (PEP 393),
# chosen by the widest character in it. Measure the cost of one more char.
def bytes_per_char(ch):
    return sys.getsizeof(ch * 1001) - sys.getsizeof(ch * 1000)

for ch in ("a", "é", "ж", "€", "😀"):
    print(repr(ch), "U+%04X" % ord(ch), "in memory:", bytes_per_char(ch), "in UTF-8:", len(ch.encode("utf-8")))

# One emoji makes the whole string 4 bytes per character
ascii_only = "a" * 1000
with_emoji = "a" * 999 + "😀"
print(len(ascii_only) == len(with_emoji))  # True
print(sys.getsizeof(with_emoji) - sys.getsizeof(ascii_only) > 2900)  # True

# len counts code points, not what a human sees as one character
family = "👨‍👩‍👧"
print(len(family), len(family.encode("utf-8")))

# Two different strings that render the same: precomposed vs combining accent
a = "café"
b = "café"
print(a == b, len(a), len(b))
print(unicodedata.normalize("NFC", a) == unicodedata.normalize("NFC", b))  # True
print(unicodedata.name(b[-1]))

# Case-insensitive matching: casefold beats lower for some scripts
print("Straße".lower() == "STRASSE".lower(), "Straße".casefold() == "STRASSE".casefold())

# A memoryview slices bytes without copying them
blob = bytearray(b"header:payload")
view = memoryview(blob)[7:]
blob[7:10] = b"PAY"
print(bytes(view))`,
      },
    ],
  },
  {
    title: "How do you read TOML with tomllib in Python 3.11+?",
    difficulty: "easy",
    seoDescription: "Read TOML in Python 3.11+ with tomllib: load with rb, loads, the type mapping, TOMLDecodeError, parse_float, defaults, and tomli-w for writing.",
    description: `**Question presented to candidate:**
"Your service keeps its settings in a TOML file, and you are on Python 3.11. How do you read it with the standard library, what do you get back, and what can trip you up?"

**What a strong answer should cover:**
- \`tomllib\` joined the standard library in Python 3.11 (PEP 680); \`tomllib.load(f)\` reads a file opened in **binary** mode (\`"rb"\`), \`tomllib.loads(s)\` parses a \`str\`
- The result is a plain \`dict\`: tables become nested dicts, arrays become lists, arrays of tables (\`[[x]]\`) become lists of dicts, and dates and times become \`datetime\` objects
- Invalid documents raise \`tomllib.TOMLDecodeError\`, a \`ValueError\` subclass, with line and column; duplicate keys are errors, unlike JSON
- \`tomllib\` is read-only: there is no \`dump\`; use the third-party \`tomli-w\` to write or \`tomlkit\` to edit while keeping comments
- Practical patterns: \`parse_float=Decimal\`, defaults merged with \`|\` or \`.get\`, and \`tomli\` as a fallback on Python 3.10 and older
- Typical use: reading \`pyproject.toml\` or an app config at start-up; TOML has no null, so a missing key means "not set"

**Code / implementation expected:** Yes — \`with open(path, "rb") as f: config = tomllib.load(f)\` and reading a nested value.`,
    answer: `**Target Audience:** Python developers who configure apps or tools, explained from zero
**Difficulty:** Easy
**Python version:** Behaviour checked on CPython 3.11, 3.12 and 3.13 (and in the page's Pyodide 3.11 runtime)

> **How to read this doc:** Each idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Every output block in the **Verified** section was copied from a real run of the examples on this page.

## 1. Why This Even Matters — A Story First

Every program has settings: which port to listen on, the database address, how many retries. You could write them in Python, but then a typo in a settings file can run code. You could write JSON, but JSON has no comments and is fussy about commas, which is miserable for a file humans edit by hand.

**TOML** ("Tom's Obvious Minimal Language") was designed as the middle ground: it reads like an old-fashioned \`.ini\` file, with \`key = value\` lines and \`[section]\` headers, but it has a precise specification and real types, so \`port = 8000\` is an integer and \`debug = false\` is a boolean, not the strings "8000" and "false". It is the format of \`pyproject.toml\`, which is why Python added a reader to the standard library.

## 2. The Core Idea

📌 **Interview term: TOML** — a configuration file format with \`key = value\` pairs, \`[table]\` headers, comments starting with \`#\`, and typed values: strings, integers, floats, booleans, arrays, inline tables, and dates and times.

📌 **Interview term: \`tomllib\`** — the standard-library TOML parser, added in Python 3.11 by [PEP 680](https://peps.python.org/pep-0680/) and based on the third-party \`tomli\` package. Its whole public API is \`load\`, \`loads\` and \`TOMLDecodeError\`. The [tomllib docs](https://docs.python.org/3/library/tomllib.html) describe it as parsing TOML 1.0.0, and the newest documentation notes TOML 1.1.0 support added in Python 3.15.

~~~python
import tomllib

with open("pyproject.toml", "rb") as f:   # binary mode, not "r"
    data = tomllib.load(f)

print(data["project"]["name"])
~~~

📌 **Interview term: \`tomllib.load\` vs \`tomllib.loads\`** — \`load(fp)\` takes a file object opened in **binary** mode; \`loads(s)\` takes a \`str\`. Both return a \`dict\`.

Why binary? The TOML specification requires UTF-8 and exact newline handling. If \`tomllib\` reads the bytes itself, it can decode them as UTF-8 regardless of the machine's locale and without text-mode newline translation. Pass a text-mode file and you get a \`TypeError\` that tells you to use \`"rb"\` (shown in the second example). For the general text-versus-binary story see [How do you read and write files in Python?](/interview-question/how-do-you-read-and-write-files-in-python).

<svg class="iq-diagram" width="100%" viewBox="0 0 1020 156" role="img" aria-label="Reading TOML: the config file is opened in binary mode, tomllib.load parses the UTF-8 bytes, and the result is a plain dict">
  <defs>
    <marker id="t1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="105" y="72" text-anchor="middle">config.toml</text>
  <text class="d-sub" x="105" y="96" text-anchor="middle">UTF-8 on disk</text>
  <path class="d-edge-accent" d="M 198 88 L 280 88" marker-end="url(#t1-arrow)"/>
  <text class="d-sub d-accent" x="239" y="72" text-anchor="middle">read</text>
  <rect class="d-box" x="290" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="375" y="72" text-anchor="middle">open rb</text>
  <text class="d-sub" x="375" y="96" text-anchor="middle">binary file</text>
  <path class="d-edge-accent" d="M 468 88 L 550 88" marker-end="url(#t1-arrow)"/>
  <text class="d-sub d-accent" x="509" y="72" text-anchor="middle">bytes</text>
  <rect class="d-box-accent" x="560" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="645" y="72" text-anchor="middle">tomllib.load</text>
  <text class="d-sub" x="645" y="96" text-anchor="middle">parse</text>
  <path class="d-edge-accent" d="M 738 88 L 820 88" marker-end="url(#t1-arrow)"/>
  <text class="d-sub d-accent" x="779" y="72" text-anchor="middle">returns</text>
  <rect class="d-box" x="830" y="40" width="170" height="76" rx="10"/>
  <text class="d-text" x="915" y="72" text-anchor="middle">dict</text>
  <text class="d-sub" x="915" y="96" text-anchor="middle">plain types</text>
</svg>

## 3. What You Get Back: the Type Mapping

| TOML | Example | Python |
| :--- | :--- | :--- |
| string | \`title = "Codepad"\` | \`str\` |
| integer | \`workers = 4\` | \`int\` |
| float | \`ratio = 0.75\` | \`float\` (or \`parse_float=\` type) |
| boolean | \`debug = false\` | \`bool\` |
| offset date-time | \`started = 1979-05-27T07:32:00Z\` | aware \`datetime.datetime\` |
| local date-time | \`at = 1979-05-27T07:32:00\` | naive \`datetime.datetime\` |
| local date | \`released = 2025-10-07\` | \`datetime.date\` |
| local time | \`alarm = 07:30:00\` | \`datetime.time\` |
| array | \`ports = [8000, 8001]\` | \`list\` |
| table | \`[database]\` | \`dict\` |
| inline table | \`user = { name = "app" }\` | \`dict\` |
| array of tables | \`[[servers]]\` repeated | \`list\` of \`dict\` |

📌 **Interview term: Table** — TOML's name for a section: a \`[name]\` header starts one, and every \`key = value\` until the next header belongs to it. A dotted header such as \`[tool.demo]\` creates nested tables, so you read it as \`data["tool"]["demo"]\`.

📌 **Interview term: Array of tables** — repeating a \`[[servers]]\` header appends a new table each time; in Python it is a list of dicts.

Two differences from JSON are worth saying out loud (compare [How do you convert between Python objects and JSON?](/interview-question/how-do-you-convert-between-python-objects-and-json)):

- **TOML has dates and times built in** and \`tomllib\` returns real \`datetime\` objects, with \`tzinfo\` set when the value has an offset.
- **TOML has no null.** A setting that is "not set" is simply absent, so read optional keys with \`config.get("timeout", 30)\`.

## 4. Errors

📌 **Interview term: \`TOMLDecodeError\`** — raised for any invalid document; a subclass of \`ValueError\`, and its message includes the line and column where the parser gave up.

TOML is strict in ways JSON parsers are not: **defining the same key twice is an error** (Python's \`json\` silently keeps the last one), a table header must be closed, and a bare word such as \`maybe\` is not a value; strings need quotes. The first example triggers all three.

The [tomllib docs](https://docs.python.org/3/library/tomllib.html) also warn that a malicious TOML document can consume a lot of CPU and memory, so limit the size of input you accept from untrusted sources.

## 5. Reading Only: How Do You Write TOML?

\`tomllib\` has no \`dump\` or \`dumps\` (the second example prints its public names to prove it). For writing and editing, the \`tomllib\` documentation points to third-party packages:

| Need | Package | Note |
| :--- | :--- | :--- |
| Write a dict as TOML | \`tomli-w\` | the writing counterpart of \`tomli\` |
| Edit a file and keep comments and formatting | \`tomlkit\` | style-preserving read and write |
| Read TOML on Python 3.10 or older | \`tomli\` | the package \`tomllib\` was based on |

A common compatibility import for libraries that still support 3.10:

~~~python
import sys

if sys.version_info >= (3, 11):
    import tomllib
else:
    import tomli as tomllib
~~~

## 6. Patterns for Real Config Files

- **Defaults plus overrides:** \`effective = DEFAULTS | file_settings\` keeps every default and lets the file win (dict merging is covered in [How do you work with dictionaries?](/interview-question/how-do-you-work-with-dictionaries-get-setdefault-items-merging)).
- **Exact decimals:** \`tomllib.load(f, parse_float=Decimal)\` turns every TOML float into a \`Decimal\`, useful for prices or rates.
- **Validation:** \`tomllib\` checks TOML syntax, not your schema. Check required keys and types yourself, or load the dict into a dataclass or a Pydantic model.
- **\`pyproject.toml\`:** \`[project]\` holds the standard package metadata and \`[tool.<name>]\` is the namespace each tool reads its own settings from. How that fits with build tools and uv is covered in [How do pyproject.toml, tomllib, and uv/pyproject workflows fit together?](/interview-question/how-do-pyproject-toml-tomllib-and-uv-pyproject-workflows-fit-together).

## 7. Code Walk-Through

Parsing a document from a string and seeing every type it produces, then three invalid documents:

~~~python
import tomllib

doc = """
# A TOML document: comments start with a hash
title = "Codepad"
debug = false
workers = 4
ratio = 0.75
released = 2025-10-07
started = 1979-05-27T07:32:00Z
ports = [8000, 8001]

[database]
host = "localhost"
user = { name = "app", admin = false }

[[servers]]
name = "alpha"

[[servers]]
name = "beta"
"""

config = tomllib.loads(doc)

# Every key maps to a plain Python type
for key, value in config.items():
    print(f"{key:9} {type(value).__name__:9} {value!r}")

# Nested tables are nested dicts; [[array of tables]] is a list of dicts
print(config["database"]["user"]["name"])  # app
print([s["name"] for s in config["servers"]])  # ['alpha', 'beta']

# Use .get with defaults for optional settings
print(config.get("timeout", 30))  # 30

# Invalid TOML raises TOMLDecodeError (a ValueError) with a position
bad_docs = [
    'name = "a"\\nname = "b"',      # the same key twice
    "port = 80\\n[server\\n",         # an unclosed table header
    "value = maybe",                # a bare word is not a value
]
for bad in bad_docs:
    try:
        tomllib.loads(bad)
    except tomllib.TOMLDecodeError as e:
        print("TOMLDecodeError:", e)
print(issubclass(tomllib.TOMLDecodeError, ValueError))  # True
~~~

Reading a real file the right way, the text-mode mistake, \`parse_float\`, defaults, and the missing writer:

~~~python
import os
import tempfile
import tomllib
from decimal import Decimal

folder = tempfile.mkdtemp()
path = os.path.join(folder, "pyproject.toml")
with open(path, "w", encoding="utf-8") as f:
    f.write(
        '[project]\\n'
        'name = "demo"\\n'
        'version = "1.2.0"\\n'
        'requires-python = ">=3.11"\\n'
        'dependencies = ["httpx>=0.27", "rich"]\\n'
        '\\n'
        '[tool.demo]\\n'
        'price = 0.1\\n'
        'retries = 3\\n'
    )

# tomllib.load needs a BINARY file: open with "rb"
with open(path, "rb") as f:
    pyproject = tomllib.load(f)
print(pyproject["project"]["name"], pyproject["project"]["dependencies"])

# A text-mode file is rejected with a clear message
with open(path, encoding="utf-8") as f:
    try:
        tomllib.load(f)
    except TypeError as e:
        print("TypeError:", e)

# Dotted table names nest: [tool.demo] becomes {"tool": {"demo": {...}}}
settings = pyproject["tool"]["demo"]
print(settings)

# parse_float lets you keep exact decimals
with open(path, "rb") as f:
    exact = tomllib.load(f, parse_float=Decimal)
print(repr(exact["tool"]["demo"]["price"]))  # Decimal('0.1')

# Layer user settings over defaults
DEFAULTS = {"retries": 1, "timeout": 30, "price": 0.0}
effective = DEFAULTS | settings
print(effective)

# tomllib only reads: there is no dump or dumps
print(hasattr(tomllib, "dumps"), [name for name in dir(tomllib) if not name.startswith("_")])
~~~

## 8. Verified: Running the Code

Both examples were run on python3.11 and in the page's Pyodide 0.25.1 runtime with identical output; the first was also run on python3.12 and python3.13, which printed the same three error messages and the same public API.

Example 1 (types, nested tables, arrays of tables, errors):

~~~text
title     str       'Codepad'
debug     bool      False
workers   int       4
ratio     float     0.75
released  date      datetime.date(2025, 10, 7)
started   datetime  datetime.datetime(1979, 5, 27, 7, 32, tzinfo=datetime.timezone.utc)
ports     list      [8000, 8001]
database  dict      {'host': 'localhost', 'user': {'name': 'app', 'admin': False}}
servers   list      [{'name': 'alpha'}, {'name': 'beta'}]
app
['alpha', 'beta']
30
TOMLDecodeError: Cannot overwrite a value (at end of document)
TOMLDecodeError: Expected ']' at the end of a table declaration (at line 2, column 8)
TOMLDecodeError: Invalid value (at line 1, column 9)
True
~~~

Example 2 (\`load\` with \`"rb"\`, text-mode error, \`parse_float\`, defaults, read-only API):

~~~text
demo ['httpx>=0.27', 'rich']
TypeError: File must be opened in binary mode, e.g. use \`open('foo.toml', 'rb')\`
{'price': 0.1, 'retries': 3}
Decimal('0.1')
{'retries': 3, 'timeout': 30, 'price': 0.1}
False ['TOMLDecodeError', 'load', 'loads']
~~~

Note the first error message: a duplicate key is reported at "end of document" rather than at the line of the second \`name\`, so the position is not always where you would look first.

## Common Pitfalls

- **Opening the file in text mode** — \`tomllib.load(open(path))\` raises \`TypeError\`; use \`open(path, "rb")\`, or read the text yourself and call \`loads\`.
- **Looking for \`tomllib.dump\`** — it does not exist; use \`tomli-w\` to write or \`tomlkit\` to edit.
- **Expecting \`None\` for a missing setting** — TOML has no null; use \`.get(key, default)\` or merge with a defaults dict.
- **Forgetting that \`[a.b]\` nests** — the value lives at \`data["a"]["b"]\`, not \`data["a.b"]\`.
- **Assuming a date value is a string** — \`released = 2025-10-07\` comes back as \`datetime.date\`, so string methods on it fail.
- **Importing \`tomllib\` on Python 3.10** — \`ModuleNotFoundError\`; fall back to \`tomli\`.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 Quick Revision — read this the morning of the interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-liner:</strong> <span style="color:#f0e2c8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">with open(path, "rb") as f: config = tomllib.load(f)</code>; or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomllib.loads(text)</code> for a string. <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomllib</code> is in the standard library from Python 3.11 (PEP 680).</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why binary:</strong> <span style="color:#f0e2c8;">TOML must be UTF-8, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomllib</code> decodes the bytes itself instead of trusting the locale; a text-mode file raises a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">TypeError</code> that says to use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">rb</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What comes back:</strong> <span style="color:#f0e2c8;">A plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dict</code>: tables are nested dicts, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[a.b]</code> nests, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[[x]]</code> is a list of dicts, and dates and times are real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">datetime</code> objects.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Errors:</strong> <span style="color:#f0e2c8;">Invalid TOML raises <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomllib.TOMLDecodeError</code>, a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ValueError</code>; duplicate keys are rejected, and there is no null, so I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">.get</code> or merge defaults with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">|</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The limits:</strong> <span style="color:#f0e2c8;">It only reads: no <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dump</code>. I use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomli-w</code> to write, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomlkit</code> to edit while keeping comments, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomli</code> on Python 3.10 and older.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tomllib.load</code> need a binary file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So it can decode the bytes as UTF-8 itself, as the TOML specification requires, regardless of the platform default encoding and without text-mode newline translation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write a TOML file?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not with the standard library. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomli-w</code> to dump a dict, or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomlkit</code> to change a value in an existing file while keeping its comments and layout.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you support Python 3.10 too?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Try <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import tomllib</code>, fall back to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">import tomli as tomllib</code> on older versions (usually behind a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sys.version_info</code> check); <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomli</code> has the same API.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the TOML equivalent of <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">null</code>?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is none. Leave the key out and read it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">config.get("key", default)</code>, or merge the parsed dict over a defaults dict.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">tomllib</code> show up in packaging?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Tools read <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pyproject.toml</code> with it (or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tomli</code>): <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[project]</code> holds standard metadata and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">[tool.&lt;name&gt;]</code> holds each tool's own settings.</span>
</div>

</div>

## Quick Glossary

| Term | Plain meaning |
| :--- | :--- |
| **TOML** | Typed, comment-friendly config format used by \`pyproject.toml\` |
| **\`tomllib\`** | Standard-library TOML reader, Python 3.11+ (PEP 680) |
| **\`load\` vs \`loads\`** | Binary file object vs \`str\`; both return a \`dict\` |
| **Table** | A \`[section]\`; dotted names nest |
| **Array of tables** | Repeated \`[[name]]\` headers; a list of dicts |
| **\`TOMLDecodeError\`** | Invalid TOML; a \`ValueError\` subclass |

**Conclusion:** On Python 3.11 and later, reading TOML is \`with open(path, "rb") as f: config = tomllib.load(f)\` (or \`tomllib.loads(text)\`), and the result is a plain dict of ordinary Python types, including real \`datetime\` objects and nested dicts for tables. The details that make a strong answer are the binary-mode requirement and why it exists, the strict errors (\`TOMLDecodeError\`, duplicate keys rejected), the absence of null and of any writer in the standard library (\`tomli-w\` and \`tomlkit\` fill that gap), and \`tomli\` as the fallback for older Pythons.`,
    examples: [
      {
        label: "tomllib.loads: every TOML type, nested tables, arrays of tables, and TOMLDecodeError",
        code: `import tomllib

doc = """
# A TOML document: comments start with a hash
title = "Codepad"
debug = false
workers = 4
ratio = 0.75
released = 2025-10-07
started = 1979-05-27T07:32:00Z
ports = [8000, 8001]

[database]
host = "localhost"
user = { name = "app", admin = false }

[[servers]]
name = "alpha"

[[servers]]
name = "beta"
"""

config = tomllib.loads(doc)

# Every key maps to a plain Python type
for key, value in config.items():
    print(f"{key:9} {type(value).__name__:9} {value!r}")

# Nested tables are nested dicts; [[array of tables]] is a list of dicts
print(config["database"]["user"]["name"])  # app
print([s["name"] for s in config["servers"]])  # ['alpha', 'beta']

# Use .get with defaults for optional settings
print(config.get("timeout", 30))  # 30

# Invalid TOML raises TOMLDecodeError (a ValueError) with a position
bad_docs = [
    'name = "a"\\nname = "b"',      # the same key twice
    "port = 80\\n[server\\n",         # an unclosed table header
    "value = maybe",                # a bare word is not a value
]
for bad in bad_docs:
    try:
        tomllib.loads(bad)
    except tomllib.TOMLDecodeError as e:
        print("TOMLDecodeError:", e)
print(issubclass(tomllib.TOMLDecodeError, ValueError))  # True`,
      },
      {
        label: "tomllib.load with rb, the text-mode error, parse_float=Decimal, defaults, and no writer",
        code: `import os
import tempfile
import tomllib
from decimal import Decimal

folder = tempfile.mkdtemp()
path = os.path.join(folder, "pyproject.toml")
with open(path, "w", encoding="utf-8") as f:
    f.write(
        '[project]\\n'
        'name = "demo"\\n'
        'version = "1.2.0"\\n'
        'requires-python = ">=3.11"\\n'
        'dependencies = ["httpx>=0.27", "rich"]\\n'
        '\\n'
        '[tool.demo]\\n'
        'price = 0.1\\n'
        'retries = 3\\n'
    )

# tomllib.load needs a BINARY file: open with "rb"
with open(path, "rb") as f:
    pyproject = tomllib.load(f)
print(pyproject["project"]["name"], pyproject["project"]["dependencies"])

# A text-mode file is rejected with a clear message
with open(path, encoding="utf-8") as f:
    try:
        tomllib.load(f)
    except TypeError as e:
        print("TypeError:", e)

# Dotted table names nest: [tool.demo] becomes {"tool": {"demo": {...}}}
settings = pyproject["tool"]["demo"]
print(settings)

# parse_float lets you keep exact decimals
with open(path, "rb") as f:
    exact = tomllib.load(f, parse_float=Decimal)
print(repr(exact["tool"]["demo"]["price"]))  # Decimal('0.1')

# Layer user settings over defaults
DEFAULTS = {"retries": 1, "timeout": 30, "price": 0.0}
effective = DEFAULTS | settings
print(effective)

# tomllib only reads: there is no dump or dumps
print(hasattr(tomllib, "dumps"), [name for name in dir(tomllib) if not name.startswith("_")])`,
      },
    ],
  },
];

export default augments;
