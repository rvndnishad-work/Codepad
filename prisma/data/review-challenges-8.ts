/**
 * "Review the AI's code" challenge bank, part 8: Python (batch 2).
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Grader de-dupes marks BY LINE, so no two findings may share a line.
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_8: CuratedReviewChallenge[] = [
  {
    slug: "py-fahrenheit",
    title: "Celsius to Fahrenheit",
    prompt:
      "Write celsius_to_fahrenheit(temps): given a list of Celsius temperatures, return a list of Fahrenheit values rounded to 1 decimal.",
    language: "python",
    difficulty: "beginner",
    estimatedMinutes: 4,
    code: `def celsius_to_fahrenheit(temps):
    result = []
    for c in temps:
        f = c * 9 / 5 + 32
        result.append(round(f), 1)
    return result`,
    findings: [
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "round's precision arg is passed to append, not round",
        explanation:
          "The parenthesis is misplaced: `round(f)` rounds to an integer, and `, 1` becomes a *second argument to append* — which raises TypeError (list.append takes one arg). It should be `result.append(round(f, 1))`.",
      },
      {
        lines: [1, 1],
        category: "edge-case",
        title: "No handling for empty or non-numeric input",
        explanation:
          "An empty list returns [] (fine), but a None or a string element makes the arithmetic raise deep in the loop with an unclear message. If the input is untrusted, validate it's an iterable of numbers up front. A list comprehension also makes the intent clearer: `[round(c * 9 / 5 + 32, 1) for c in temps]`.",
        points: 5,
      },
    ],
  },
  {
    slug: "py-is-palindrome",
    title: "Palindrome check",
    prompt:
      "Write is_palindrome(s): true if s reads the same forwards and backwards, ignoring case, spaces, and punctuation.",
    language: "python",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `def is_palindrome(s):
    s = s.lower()
    cleaned = [ch for ch in s if ch.isalnum]
    for i in range(len(cleaned) / 2):
        if cleaned[i] != cleaned[-i]:
            return False
    return True`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "isalnum is a method reference, never called",
        explanation:
          "`ch.isalnum` (no parentheses) is a bound method object, which is always truthy — so the filter keeps *every* character including spaces and punctuation, defeating the cleaning. Call it: `if ch.isalnum()`.",
      },
      {
        lines: [4, 4],
        category: "logic-bug",
        title: "range() needs an int; / yields a float",
        explanation:
          "In Python 3, `len(cleaned) / 2` is a float and range() raises `TypeError: 'float' object cannot be interpreted as an integer`. Use integer division: `range(len(cleaned) // 2)`.",
      },
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "cleaned[-i] is wrong for i = 0",
        explanation:
          "The mirror index should be `-(i + 1)` (or `len-1-i`): when i is 0, `cleaned[-0]` is `cleaned[0]`, comparing the first character to itself instead of to the last. The whole check can be replaced with `cleaned == cleaned[::-1]`.",
      },
    ],
  },
  {
    slug: "py-two-sum",
    title: "Two-sum",
    prompt:
      "Write two_sum(nums, target): return the indices of the two numbers that add up to target, or None if there's no pair.",
    language: "python",
    difficulty: "beginner",
    estimatedMinutes: 6,
    code: `def two_sum(nums, target):
    seen = {}
    for i in range(len(nums)):
        for j in range(len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return None`,
    findings: [
      {
        lines: [4, 4],
        category: "performance",
        title: "O(n²) double loop when a hash map gives O(n)",
        explanation:
          "The `seen` dict was declared but never used — the intended one-pass solution stores each value's index and checks for target - nums[i]: `if target - x in seen: return [seen[target - x], i]` else `seen[x] = i`. That's O(n) instead of scanning all pairs.",
        points: 5,
      },
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "An element can pair with itself",
        explanation:
          "The inner loop starts at 0, so when i == j the code checks `nums[i] + nums[i]` — for target 6 and a single 3, it returns [k, k], reusing one element. Either start j at i+1, or with the hash-map approach check membership *before* inserting the current index.",
      },
    ],
  },
  {
    slug: "py-flatten-dict",
    title: "Flatten a nested dict",
    prompt:
      "Write flatten(d, prefix='') that flattens a nested dict into dotted keys, e.g. {'a': {'b': 1}} -> {'a.b': 1}.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `def flatten(d, prefix="", out={}):
    for key, value in d.items():
        full_key = prefix + key
        if isinstance(value, dict):
            flatten(value, full_key)
        else:
            out[full_key] = value
    return out`,
    findings: [
      {
        lines: [1, 1],
        category: "logic-bug",
        title: "Mutable default `out={}` persists across calls",
        explanation:
          "The default dict is created once and shared by every call that omits `out`, so results from one call leak into the next — flatten(a) then flatten(b) returns a's keys too. Default to None and create inside: `if out is None: out = {}`.",
      },
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "The dot separator is never added",
        explanation:
          "full_key is `prefix + key` with no delimiter, so {'a': {'b': 1}} becomes 'ab', not 'a.b'. Add the dot only when prefix is non-empty: `full_key = f'{prefix}.{key}' if prefix else key`.",
      },
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "Recursive result isn't threaded through",
        explanation:
          "The recursive call doesn't pass `out` (and its return value is ignored), so with the mutable-default bug fixed, nested values would vanish entirely. Pass the accumulator down: `flatten(value, full_key, out)`.",
      },
    ],
  },
  {
    slug: "py-csv-sum",
    title: "Sum a CSV column",
    prompt:
      "Write sum_column(path, column) that reads a CSV with a header row and returns the sum of the given numeric column.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `import csv

def sum_column(path, column):
    total = 0
    rows = open(path).readlines()
    for row in rows:
        cells = row.split(",")
        total += cells[column]
    return total`,
    findings: [
      {
        lines: [6, 7],
        category: "logic-bug",
        title: "Naive split ignores CSV quoting and the header",
        explanation:
          "Splitting on commas breaks on quoted fields containing commas ('\"Smith, John\"'), and the header row is included in the loop. Use the imported csv module (csv.DictReader) which handles quoting and gives you named columns — the import is even present but unused.",
      },
      {
        lines: [8, 8],
        category: "logic-bug",
        title: "Adding strings, and indexing a row by a column name",
        explanation:
          "cells[column] is a string, so `total += cells[column]` concatenates (or raises if total is an int) — you must convert: `int(cells[idx])` / `float(...)`. And if `column` is a name rather than an integer index, list indexing fails outright. DictReader plus float() fixes both.",
      },
      {
        lines: [5, 5],
        category: "edge-case",
        title: "File is opened but never closed, and read fully into memory",
        explanation:
          "open(...).readlines() leaks the file handle and loads the whole file at once. Use `with open(path, newline='') as f:` and iterate the reader lazily so large files stream row by row.",
        points: 5,
      },
    ],
  },
  {
    slug: "py-moving-average",
    title: "Moving average",
    prompt:
      "Write moving_average(nums, k): return the list of averages of each consecutive window of size k.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `def moving_average(nums, k):
    averages = []
    for i in range(len(nums)):
        window = nums[i:i + k]
        averages.append(sum(window) / len(window))
    return averages`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "Trailing windows are shorter than k",
        explanation:
          "Iterating to len(nums) means the last k-1 windows run off the end and are shorter than k, producing extra averages the prompt didn't ask for (n outputs instead of n-k+1). Stop early: `range(len(nums) - k + 1)`.",
      },
      {
        lines: [5, 5],
        category: "performance",
        title: "Re-summing each window is O(n·k)",
        explanation:
          "Every window recomputes sum() from scratch. A sliding sum is O(n): keep a running total, add the entering element and subtract the leaving one as the window advances.",
        points: 5,
      },
      {
        lines: [1, 1],
        category: "edge-case",
        title: "k <= 0 or k > len(nums) isn't handled",
        explanation:
          "k = 0 makes an empty window and divides by zero; k larger than the list yields nothing meaningful. Validate k (1 <= k <= len(nums)) and decide the empty-input contract before the loop.",
      },
    ],
  },
  {
    slug: "py-thread-counter",
    title: "Thread-safe counter",
    prompt:
      "Increment a shared counter from many threads and print the final total. It should equal the number of increments.",
    language: "python",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `import threading

counter = 0

def worker():
    global counter
    for _ in range(100000):
        counter += 1

threads = [threading.Thread(target=worker) for _ in range(4)]
for t in threads:
    t.start()
    t.join()

print(counter)`,
    findings: [
      {
        lines: [8, 8],
        category: "logic-bug",
        title: "counter += 1 is not atomic — a data race",
        explanation:
          "`counter += 1` is read-modify-write; two threads can read the same value and both write back, losing increments (yes, even under the GIL, because the bytecode is interruptible between the read and the store). Guard it with a threading.Lock around the increment, or use itertools/atomic patterns.",
      },
      {
        lines: [11, 13],
        category: "logic-bug",
        title: "start()+join() in the same loop runs threads serially",
        explanation:
          "Joining inside the start loop waits for each thread to finish before starting the next, so there's no concurrency at all (it also masks the race above). Start all threads in one loop, then join them in a second loop.",
      },
    ],
  },
  {
    slug: "py-download-images",
    title: "Download a list of images",
    prompt:
      "Write download_all(urls, out_dir): download each image URL into out_dir, naming files by the URL's last path segment.",
    language: "python",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `import os
import requests

def download_all(urls, out_dir):
    for url in urls:
        name = url.split("/")[-1]
        path = os.path.join(out_dir, name)
        data = requests.get(url).content
        with open(path, "w") as f:
            f.write(data)`,
    findings: [
      {
        lines: [9, 10],
        category: "logic-bug",
        title: "Binary content written in text mode",
        explanation:
          "requests .content is bytes, but the file is opened in text mode ('w') and f.write(bytes) raises TypeError (and would corrupt via encoding even if it didn't). Open in binary: `open(path, 'wb')`.",
      },
      {
        lines: [6, 7],
        category: "security",
        title: "Filename from the URL enables path traversal",
        explanation:
          "The last path segment is trusted as a filename — a URL ending in `/..%2f..%2fetc%2fpasswd` (or with query strings/encoded slashes) can write outside out_dir. Sanitize with os.path.basename and reject names containing separators, then verify the resolved path stays within out_dir.",
      },
      {
        lines: [8, 8],
        category: "edge-case",
        title: "No status check, timeout, or error handling",
        explanation:
          "requests.get with no timeout can hang forever, and a 404/500 returns an error page whose bytes get written as if they were an image. Pass timeout=, check resp.raise_for_status(), and stream large downloads with stream=True + iter_content instead of buffering .content.",
        points: 5,
      },
    ],
  },
  {
    slug: "py-order-total",
    title: "Order total with tax and discount",
    prompt:
      "Write order_total(items, tax_rate, coupon=None): sum item price*qty, apply a percentage coupon if given, then add tax. Return a Decimal-accurate money value.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `def order_total(items, tax_rate, coupon=None):
    subtotal = 0
    for item in items:
        subtotal += item["price"] * item["qty"]

    if coupon:
        subtotal = subtotal * (1 - coupon / 100)

    total = subtotal + subtotal * tax_rate
    return round(total, 2)`,
    findings: [
      {
        lines: [4, 4],
        category: "logic-bug",
        title: "Float arithmetic on money accumulates error",
        explanation:
          "Prices as floats mean sums like 0.1 + 0.2 drift, and round() at the end can't undo accumulated error — the prompt explicitly asked for Decimal-accurate money. Use decimal.Decimal for prices/rates (or integer cents) throughout.",
      },
      {
        lines: [6, 6],
        category: "edge-case",
        title: "`if coupon` treats a 0% coupon as no coupon",
        explanation:
          "A coupon of 0 is falsy, so a legitimately zero-percent coupon is skipped — harmless here, but the same bug hides invalid values. More importantly there's no bounds check: a coupon of 150 makes the multiplier negative and flips the sign of the order. Test `if coupon is not None` and validate 0 <= coupon <= 100.",
      },
      {
        lines: [10, 10],
        category: "logic-bug",
        title: "round() uses banker's rounding, not money rounding",
        explanation:
          "Python's round() does round-half-to-even, so round(2.675, 2) is 2.67, not 2.68 — surprising for currency and legally wrong in some contexts. Quantize a Decimal with ROUND_HALF_UP: `Decimal(total).quantize(Decimal('0.01'), ROUND_HALF_UP)`.",
        points: 5,
      },
    ],
  },
  {
    slug: "py-config-loader",
    title: "Load YAML config with env overrides",
    prompt:
      "Write load_config(path): parse a YAML config file and let environment variables override top-level keys (e.g. env APP_PORT overrides 'port').",
    language: "python",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `import os
import yaml

def load_config(path):
    config = yaml.load(open(path).read())

    for key in config:
        env_key = "APP_" + key.upper()
        if os.environ[env_key]:
            config[key] = os.environ[env_key]

    return config`,
    findings: [
      {
        lines: [5, 5],
        category: "security",
        title: "yaml.load without a safe loader executes arbitrary tags",
        explanation:
          "yaml.load on untrusted input can construct arbitrary Python objects (the classic `!!python/object/apply:os.system` RCE). Use `yaml.safe_load(...)`, which only builds plain data types.",
      },
      {
        lines: [9, 9],
        category: "logic-bug",
        title: "os.environ[key] raises KeyError when the var is unset",
        explanation:
          "Indexing os.environ throws for any key not present, so the loop crashes on the first config key without a matching env var. Use `os.environ.get(env_key)` and only override when it's not None.",
      },
      {
        lines: [10, 10],
        category: "edge-case",
        title: "Env overrides are always strings — types are lost",
        explanation:
          "Environment values are strings, so overriding a numeric 'port' with APP_PORT='8080' stores the string '8080', and later `config['port'] + 1` breaks. Coerce the override to the type of the existing value (or to a schema-declared type) before assigning.",
        points: 5,
      },
    ],
  },
  {
    slug: "py-dedupe-records",
    title: "Deduplicate records by id",
    prompt:
      "Write dedupe(records): given a list of dicts each with an 'id', return a list with duplicates removed, keeping the *last* occurrence of each id, preserving overall order.",
    language: "python",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `def dedupe(records):
    seen = set()
    result = []
    for r in records:
        if r["id"] not in seen:
            seen.add(r["id"])
            result.append(r)
    return result`,
    findings: [
      {
        lines: [7, 7],
        category: "logic-bug",
        title: "Keeps the first occurrence, not the last",
        explanation:
          "The prompt asks to keep the *last* record per id, but this skips any id already seen — so it keeps the first and drops later (presumably newer) versions. Either iterate in reverse (then reverse the result) or build a dict `{r['id']: r for r in records}` which naturally keeps the last and, in Python 3.7+, preserves insertion order of first-seen keys (adjust if last-position order is required).",
      },
      {
        lines: [5, 5],
        category: "edge-case",
        title: "A record missing 'id' raises KeyError",
        explanation:
          "Any record without an 'id' key crashes the whole function. Decide the contract — skip such records, or group them under a sentinel — using `r.get('id')` rather than indexing.",
        points: 5,
      },
    ],
  },
];
