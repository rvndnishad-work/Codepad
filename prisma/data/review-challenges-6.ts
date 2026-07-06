/**
 * "Review the AI's code" challenge bank, part 6: JavaScript (batch 2).
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Grader de-dupes marks BY LINE, so no two findings may share a line.
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_6: CuratedReviewChallenge[] = [
  {
    slug: "js-fizzbuzz",
    title: "FizzBuzz",
    prompt:
      "Classic FizzBuzz: print 1..n, but 'Fizz' for multiples of 3, 'Buzz' for multiples of 5, 'FizzBuzz' for multiples of both.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `function fizzbuzz(n) {
  const out = [];
  for (let i = 1; i < n; i++) {
    if (i % 3 === 0) {
      out.push("Fizz");
    } else if (i % 5 === 0) {
      out.push("Buzz");
    } else if (i % 3 === 0 && i % 5 === 0) {
      out.push("FizzBuzz");
    } else {
      out.push(i);
    }
  }
  return out;
}`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "Off-by-one: n itself is never printed",
        explanation:
          "`i < n` stops at n-1, so fizzbuzz(15) never prints the 15th value — the prompt says 1..n inclusive. Use `i <= n`.",
      },
      {
        lines: [8, 8],
        category: "logic-bug",
        title: "The FizzBuzz branch is unreachable",
        explanation:
          "A number divisible by both 3 and 5 already matched the very first `i % 3 === 0` branch, so this else-if never runs and 15/30/45 print 'Fizz'. The combined check must come *first*: test `i % 15 === 0` (or `i%3===0 && i%5===0`) before the individual cases.",
      },
      {
        lines: [11, 11],
        category: "edge-case",
        title: "Mixed types in the output array",
        explanation:
          "Non-multiples push the number `i`, while others push strings — the array is a mix of numbers and strings. If the caller expects to join or compare them uniformly this surprises; push `String(i)` (or `i.toString()`) to keep the output homogeneous.",
        points: 5,
      },
    ],
  },
  {
    slug: "js-title-case",
    title: "Title-case a string",
    prompt:
      "Write titleCase(str) that upper-cases the first letter of each word and lower-cases the rest. Collapse extra whitespace.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `function titleCase(str) {
  const words = str.split(" ");
  for (let i = 0; i < words.length; i++) {
    words[i][0] = words[i][0].toUpperCase();
    words[i] = words[i].slice(1).toLowerCase();
  }
  return words.join(" ");
}`,
    findings: [
      {
        lines: [2, 2],
        category: "edge-case",
        title: "split(' ') doesn't collapse repeated whitespace",
        explanation:
          "Splitting on a single space turns 'a  b' (two spaces) into ['a','','b'] — empty tokens survive and tabs/newlines aren't handled at all. The prompt asked to collapse whitespace: `str.trim().split(/\\s+/)`.",
      },
      {
        lines: [4, 4],
        category: "logic-bug",
        title: "Strings are immutable — assigning to an index is a no-op",
        explanation:
          "`words[i][0] = ...` silently does nothing (in strict mode it throws) because you can't mutate a character of a JS string. Build the new word from pieces: `words[i] = words[i][0].toUpperCase() + words[i].slice(1).toLowerCase()`.",
      },
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "The upper-cased first letter is immediately discarded",
        explanation:
          "Even if line 4 worked, this line overwrites words[i] with slice(1).toLowerCase() — the capital first letter is dropped, so output is all lowercase. The two operations must be combined into one assignment.",
      },
    ],
  },
  {
    slug: "js-anagram",
    title: "Anagram check",
    prompt:
      "Write isAnagram(a, b): true when the two strings are anagrams, case-insensitive and ignoring spaces.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `function isAnagram(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  const sortedA = a.toLowerCase().split("").sort();
  const sortedB = b.toLowerCase().split("").sort();
  return sortedA === sortedB;
}`,
    findings: [
      {
        lines: [2, 2],
        category: "logic-bug",
        title: "Length check runs before spaces are stripped",
        explanation:
          "The prompt says ignore spaces, but this compares raw lengths — 'dormitory' vs 'dirty room' (same letters) fails immediately because the space makes the lengths differ. Normalize (lowercase + remove spaces) *first*, then compare.",
      },
      {
        lines: [5, 5],
        category: "edge-case",
        title: "Spaces are never removed",
        explanation:
          "toLowerCase().split('') keeps the spaces as characters, so they end up in the sorted arrays and 'a b' vs 'ab' won't match. Strip them: `a.toLowerCase().replace(/\\s/g, '').split('')`.",
      },
      {
        lines: [7, 7],
        category: "logic-bug",
        title: "=== compares array references, not contents",
        explanation:
          "Two distinct arrays are never === even with identical elements — this always returns false. Compare the joined strings instead: `sortedA.join('') === sortedB.join('')`.",
      },
    ],
  },
  {
    slug: "js-flatten",
    title: "Flatten a nested array",
    prompt:
      "Write flatten(arr) that fully flattens an arbitrarily nested array of numbers into a single-level array.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `function flatten(arr) {
  let result = [];
  for (const item of arr) {
    if (typeof item === "array") {
      result.concat(flatten(item));
    } else {
      result.push(item);
    }
  }
  return result;
}`,
    findings: [
      {
        lines: [4, 4],
        category: "logic-bug",
        title: '`typeof item === "array"` is never true',
        explanation:
          "typeof an array returns 'object', never 'array' — so nested arrays fall into the else branch and get pushed whole, defeating the flatten. Detect arrays with `Array.isArray(item)`.",
      },
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "concat returns a new array — its result is thrown away",
        explanation:
          "Array.concat doesn't mutate; it returns a new array that's discarded here, so nested items are silently lost. Assign it back (`result = result.concat(flatten(item))`) or spread-push (`result.push(...flatten(item))`).",
      },
    ],
  },
  {
    slug: "js-promise-all-settled",
    title: "Run tasks with a concurrency limit",
    prompt:
      "Write runWithLimit(tasks, limit): run an array of async task functions, at most `limit` at a time, and resolve with results in the original order.",
    language: "javascript",
    difficulty: "advanced",
    estimatedMinutes: 10,
    code: `async function runWithLimit(tasks, limit) {
  const results = [];
  let i = 0;

  async function worker() {
    while (i < tasks.length) {
      const task = tasks[i];
      i++;
      const result = await task();
      results.push(result);
    }
  }

  const workers = [];
  for (let w = 0; w < limit; w++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}`,
    findings: [
      {
        lines: [10, 10],
        category: "logic-bug",
        title: "Results land in completion order, not input order",
        explanation:
          "`i` is captured, then incremented, then the task is awaited — but results.push happens whenever each task *finishes*, so a slow task at index 0 ends up after fast later tasks. The prompt requires original order: capture the index (`const idx = i++`) and assign `results[idx] = await task()`.",
      },
      {
        lines: [15, 15],
        category: "edge-case",
        title: "limit larger than tasks.length spawns idle workers",
        explanation:
          "If limit > tasks.length (or limit <= 0), you either spin up workers that immediately exit (harmless but wasteful) or, for limit 0, spawn none and hang forever returning an empty result. Clamp: `const n = Math.max(1, Math.min(limit, tasks.length))`.",
        points: 5,
      },
      {
        lines: [9, 9],
        category: "edge-case",
        title: "One rejected task aborts the whole batch",
        explanation:
          "A single task() rejection propagates out of the worker and Promise.all rejects, discarding every result computed so far with no indication of which task failed. If partial success matters, wrap each task in try/catch and record {status, value/reason} (the Promise.allSettled shape).",
      },
    ],
  },
  {
    slug: "js-lru-cache",
    title: "LRU cache",
    prompt:
      "Implement an LRUCache class with get(key) and put(key, value); when it exceeds capacity, evict the least-recently-used entry. get and put should be O(1).",
    language: "javascript",
    difficulty: "advanced",
    estimatedMinutes: 10,
    code: `class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    return this.map.get(key);
  }

  put(key, value) {
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys()[0];
      this.map.delete(oldest);
    }
  }
}`,
    findings: [
      {
        lines: [8, 9],
        category: "logic-bug",
        title: "get() doesn't mark the key as recently used",
        explanation:
          "Reading a key should make it most-recently-used, but get() only returns the value — so a frequently-read key can still be evicted as 'oldest'. On a hit, delete and re-set it (or use map.delete then map.set) to move it to the end of the Map's insertion order.",
      },
      {
        lines: [13, 13],
        category: "logic-bug",
        title: "put() of an existing key doesn't refresh its recency",
        explanation:
          "Map.set on an existing key updates the value but keeps its original insertion position, so re-putting a key doesn't make it recently-used. Delete it first, then set, so it moves to the newest position.",
      },
      {
        lines: [15, 15],
        category: "hallucinated-api",
        title: "map.keys() returns an iterator, not an array",
        explanation:
          "Map.keys() gives a MapIterator — `[0]` on it is undefined, so delete(undefined) removes nothing and the cache grows past capacity. Grab the first key with `this.map.keys().next().value`.",
      },
    ],
  },
  {
    slug: "js-copy-to-clipboard",
    title: "Copy-to-clipboard button",
    prompt:
      "Wire up a 'Copy' button that copies the contents of a text field to the clipboard and shows a brief 'Copied!' confirmation.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `const button = document.querySelector("#copy");
const field = document.querySelector("#field");
const toast = document.querySelector("#toast");

button.addEventListener("click", () => {
  navigator.clipboard.writeText(field.value);
  toast.textContent = "Copied!";
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 1500);

  button.innerHTML = field.value + " copied";
});`,
    findings: [
      {
        lines: [6, 6],
        category: "edge-case",
        title: "clipboard.writeText is async and unhandled",
        explanation:
          "writeText returns a Promise that can reject (permission denied, insecure context, document not focused) — here the rejection is unhandled and the UI shows 'Copied!' even when nothing was copied. Await it (or .then/.catch) and only show success on resolve.",
      },
      {
        lines: [13, 13],
        category: "security",
        title: "User-controlled value written via innerHTML",
        explanation:
          "field.value is put into innerHTML, so a value like `<img src=x onerror=alert(1)>` executes as HTML (self-XSS that becomes real XSS if the field is ever prefilled from a URL/param). Use textContent — you're only showing text.",
      },
    ],
  },
  {
    slug: "js-form-validation",
    title: "Signup form validation",
    prompt:
      "Validate a signup form on submit: name required, valid email, password at least 8 chars. Show errors and don't submit if invalid.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `const form = document.querySelector("#signup");

form.addEventListener("submit", (e) => {
  const name = form.name.value;
  const email = form.email.value;
  const password = form.password.value;

  let valid = true;
  if (name == "") valid = false;
  if (!email.contains("@")) valid = false;
  if (password.length < 8) valid = false;

  if (valid == false) {
    showErrors();
  }
});

function showErrors() {
  document.querySelector("#error").textContent = "Please fix the form";
}`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "submit handler never calls preventDefault",
        explanation:
          "Without e.preventDefault(), the form submits and the page navigates regardless of validation — the whole check is bypassed the moment the browser reloads. Call e.preventDefault() up front (and only submit programmatically when valid).",
      },
      {
        lines: [10, 10],
        category: "hallucinated-api",
        title: "Strings have no .contains() method",
        explanation:
          "String membership is `email.includes('@')` — .contains() is Java/DOMTokenList vocabulary and throws `email.contains is not a function`, so validation crashes on every submit. (A real email check also wants more than an '@'.)",
      },
      {
        lines: [13, 15],
        category: "edge-case",
        title: "Nothing happens on the valid path",
        explanation:
          "When valid, no submit is triggered and no errors are cleared from a previous attempt — a user who fixes the form sees the stale 'Please fix the form' message and the form never proceeds. Add an else that clears errors and submits.",
        points: 5,
      },
    ],
  },
  {
    slug: "js-group-by",
    title: "groupBy utility",
    prompt:
      "Write groupBy(array, keyFn) that returns an object mapping each key (from keyFn) to the array of items with that key.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `function groupBy(array, keyFn) {
  const groups = {};
  for (const item of array) {
    const key = keyFn(item);
    if (groups[key] === undefined) {
      groups[key] = [];
    }
    groups.key.push(item);
  }
  return groups;
}`,
    findings: [
      {
        lines: [8, 8],
        category: "logic-bug",
        title: "groups.key uses a literal property named 'key'",
        explanation:
          "Dot access reads the property literally called 'key', not the value of the variable `key`. Every item is pushed onto groups.key (which was never initialized on line 6's dynamic key, so it throws 'Cannot read properties of undefined'). Use bracket access: `groups[key].push(item)`.",
      },
      {
        lines: [2, 2],
        category: "edge-case",
        title: "Plain-object accumulator inherits prototype keys",
        explanation:
          "Using {} means keys like 'constructor', '__proto__' or 'toString' collide with inherited properties — `groups['__proto__']` doesn't create an own property and can corrupt the prototype. Prefer `Object.create(null)` or a Map for arbitrary/user-derived keys.",
        points: 5,
      },
    ],
  },
  {
    slug: "js-currency-format",
    title: "Format cents as currency",
    prompt:
      "Write formatPrice(cents) that formats an integer number of cents as a USD string like $1,299.00.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `function formatPrice(cents) {
  const dollars = cents / 100;
  return "$" + dollars.toFixed(2).toLocaleString();
}`,
    findings: [
      {
        lines: [3, 3],
        category: "logic-bug",
        title: "toLocaleString on a string does nothing useful",
        explanation:
          "toFixed(2) returns a *string*, and String.prototype.toLocaleString doesn't add thousands separators — so 129900 cents formats as '$1299.00', never '$1,299.00'. Format the number directly: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)`.",
      },
      {
        lines: [2, 2],
        category: "edge-case",
        title: "Float division introduces rounding error",
        explanation:
          "cents / 100 is floating point, so amounts like 1999 → 19.99 are fine but chained math on the result accumulates error (0.1 + 0.2 problems). Since the input is already integer cents, prefer Intl currency formatting on the exact value, or work in integer math and insert the decimal by string manipulation.",
        points: 5,
      },
    ],
  },
  {
    slug: "js-poll-until",
    title: "Poll an endpoint until ready",
    prompt:
      "Write pollUntilReady(url): poll GET url every 2s until the JSON response has status === 'ready', then resolve with the payload. Give up after 30s.",
    language: "javascript",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `function pollUntilReady(url) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "ready") {
        resolve(data);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(interval);
    }, 30000);
  });
}`,
    findings: [
      {
        lines: [11, 13],
        category: "logic-bug",
        title: "The 30s timeout never rejects — it just goes silent",
        explanation:
          "On timeout the interval is cleared but the Promise is neither resolved nor rejected, so `await pollUntilReady(url)` hangs forever when the resource is never ready. The executor should also reject: `reject(new Error('timed out'))` inside the setTimeout.",
      },
      {
        lines: [3, 3],
        category: "edge-case",
        title: "setInterval doesn't wait for the previous poll to finish",
        explanation:
          "The callback is async but setInterval fires every 2s regardless of whether the last fetch is still in flight — a slow endpoint causes overlapping requests to pile up. Prefer a self-scheduling setTimeout that only queues the next poll after the current one settles.",
      },
      {
        lines: [4, 5],
        category: "edge-case",
        title: "No error handling on the fetch/parse",
        explanation:
          "A network blip or a non-JSON error page makes fetch/res.json() reject; the rejection escapes the async callback as an unhandled rejection and the interval keeps running blindly. Wrap in try/catch and decide whether a failed poll should retry or reject.",
      },
    ],
  },
];
