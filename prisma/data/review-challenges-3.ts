/**
 * "Review the AI's code" challenge bank, part 3: JavaScript.
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 *
 * Grader note: marks are de-duped per line, so no two findings in one
 * challenge may anchor to the same line.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_3: CuratedReviewChallenge[] = [
  {
    slug: "js-event-emitter",
    title: "Tiny event emitter",
    prompt:
      "Write a small EventEmitter class: on(event, fn), once(event, fn), off(event, fn) and emit(event, ...args). once handlers must run exactly one time.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `class Emitter {
  constructor() {
    this.listeners = {};
  }

  on(event, fn) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
  }

  once(event, fn) {
    this.on(event, (...args) => {
      fn(...args);
      this.off(event, fn);
    });
  }

  off(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event].remove(fn);
    }
  }

  emit(event, ...args) {
    const payload = JSON.parse(JSON.stringify(args));
    for (const fn of this.listeners[event]) {
      fn(...payload);
    }
  }
}`,
    findings: [
      {
        lines: [16, 16],
        category: "logic-bug",
        title: "once() tries to remove the original fn, not the wrapper",
        explanation:
          "What was registered on line 14 is the anonymous *wrapper*, but off() is called with the original `fn` — which is not in the listeners array, so nothing is removed and the wrapper keeps firing on every emit. 'once' runs forever. Keep a reference to the wrapper and pass *that* to off: `const wrapper = (...args) => { fn(...args); this.off(event, wrapper); };`.",
      },
      {
        lines: [22, 22],
        category: "hallucinated-api",
        title: "Arrays don't have a .remove() method",
        explanation:
          "JavaScript arrays have no .remove() — that's Python's list.remove / Rust's Vec::remove vocabulary. This throws `this.listeners[event].remove is not a function` the first time off() is called. Use `const i = arr.indexOf(fn); if (i !== -1) arr.splice(i, 1);` or reassign with .filter().",
      },
      {
        lines: [27, 27],
        category: "performance",
        title: "Every emit deep-clones the payload via a JSON round-trip",
        explanation:
          "JSON.parse(JSON.stringify(args)) on every single emit is slow on hot paths — and it silently corrupts the payload: functions and undefined disappear, Dates become strings, Maps/Sets become {}. Event emitters pass arguments through untouched; if a caller needs isolation, that's the caller's job (or use structuredClone at the call site).",
      },
      {
        lines: [28, 28],
        category: "edge-case",
        title: "emit() crashes when an event has no listeners",
        explanation:
          "For an event nobody subscribed to, `this.listeners[event]` is undefined, and `for...of undefined` throws `TypeError: undefined is not iterable`. Emitting an unused event should be a no-op: iterate `this.listeners[event] || []` (and iterate a *copy* — a listener that calls off() mid-emit would skip its neighbour).",
      },
    ],
  },
  {
    slug: "js-infinite-scroll",
    title: "Infinite scroll with IntersectionObserver",
    prompt:
      "Add infinite scroll to the product list: when the sentinel div at the bottom becomes visible, fetch the next page from /api/products and append the items. Stop when the API returns an empty page.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `const list = document.querySelector("#products");
const sentinel = document.querySelector("#sentinel");
let page = 1;

const observer = new IntersectionObserver(async (entries) => {
  if (!entries[0].isIntersecting) return;

  const res = await fetch(\`/api/products?page=\${page}\`);
  const products = await res.json();

  for (const p of products) {
    const card = \`<div class="card">\${p.name}</div>\`;
    list.innerHTML += card;
  }
  page++;

  if (products.length === 0) {
    observer.pause();
  }
});

observer.observe(sentinel, { threshold: 0.5 });`,
    findings: [
      {
        lines: [6, 6],
        category: "logic-bug",
        title: "No in-flight guard — the same page can load twice",
        explanation:
          "While the fetch on line 8 is awaited, `page` hasn't been incremented yet. If the observer fires again (scroll jitter, the sentinel re-entering the viewport), a second request for the *same* page goes out and its products get appended twice. Keep a `loading` flag (or unobserve the sentinel while a page is in flight) and skip re-entrant calls.",
      },
      {
        lines: [12, 12],
        category: "security",
        title: "Unescaped product name interpolated into HTML",
        explanation:
          "p.name comes from the API and is dropped straight into markup — a product named `<img src=x onerror=alert(1)>` executes script in every visitor's browser (stored XSS). Create elements with document.createElement and assign textContent, or escape the value before interpolating.",
      },
      {
        lines: [13, 13],
        category: "performance",
        title: "innerHTML += re-parses the entire list on every card",
        explanation:
          "`list.innerHTML += card` serializes ALL existing cards to a string, appends one, and re-parses the whole thing — O(n²) across the session, and it destroys event listeners and state (focus, selection) on every existing card each time. Build the batch and append once with insertAdjacentHTML(\"beforeend\", ...) or append real nodes.",
      },
      {
        lines: [18, 18],
        category: "hallucinated-api",
        title: "IntersectionObserver has no .pause() method",
        explanation:
          "The IntersectionObserver API is observe / unobserve / disconnect — .pause() doesn't exist and throws `observer.pause is not a function` exactly when the list ends (the last page). Use `observer.unobserve(sentinel)` or `observer.disconnect()`.",
      },
      {
        lines: [22, 22],
        category: "hallucinated-api",
        title: "observe() doesn't take an options argument",
        explanation:
          "`threshold` belongs in the IntersectionObserver *constructor* options: `new IntersectionObserver(cb, { threshold: 0.5 })`. observe(target) accepts only the element — the second argument is silently ignored, so the intended 50% threshold never applies (the callback fires at the default 0). Silent-ignore hallucinations like this are nastier than throwing ones.",
      },
    ],
  },
  {
    slug: "js-deep-clone",
    title: "deepClone utility",
    prompt:
      "Write deepClone(value) that deep-copies plain objects, arrays, Dates and Maps. It must not blow up on circular references.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 6,
    code: `function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.clone();
  }

  if (obj instanceof Map) {
    return new Map(obj);
  }

  if (Array.isArray(obj)) {
    return JSON.parse(JSON.stringify(obj));
  }

  const copy = {};
  for (const key in obj) {
    copy[key] = deepClone(obj[key]);
  }
  return copy;
}`,
    findings: [
      {
        lines: [7, 7],
        category: "hallucinated-api",
        title: "Date has no .clone() method",
        explanation:
          "JavaScript Dates are cloned with `new Date(obj.getTime())` (or new Date(obj)) — .clone() doesn't exist and throws `obj.clone is not a function` on the first Date encountered. It's Java/moment.js vocabulary blended into the standard library.",
      },
      {
        lines: [11, 11],
        category: "logic-bug",
        title: "Maps are copied shallowly",
        explanation:
          "`new Map(obj)` copies the *entries*, but keys and values still reference the original objects — mutate a value in the clone and the original changes too. The prompt asked for a deep copy: `new Map([...obj].map(([k, v]) => [deepClone(k), deepClone(v)]))`.",
      },
      {
        lines: [15, 15],
        category: "performance",
        title: "Arrays take a slow JSON round-trip that corrupts values",
        explanation:
          "Serializing and re-parsing is the slowest way to clone (two full passes + string allocation the size of the data), and it breaks the function's own contract: Dates inside arrays become strings, Maps become {}, undefined and functions vanish. Recurse like the object branch does: `obj.map((item) => deepClone(item))`.",
      },
      {
        lines: [20, 20],
        category: "edge-case",
        title: "Circular references recurse forever",
        explanation:
          "The prompt explicitly required cycle safety, but there's no bookkeeping: `a.self = a` recurses until `RangeError: Maximum call stack size exceeded`. Thread a WeakMap of already-cloned objects through the recursion (check it before cloning, set it before recursing) — the same trick structuredClone uses internally.",
      },
    ],
  },
  {
    slug: "js-rate-limit",
    title: "Express rate-limit middleware",
    prompt:
      "Write an Express middleware rateLimit(maxRequests, windowMs) that limits each client IP to maxRequests per window. Reply 429 with a Retry-After header when over the limit.",
    language: "javascript",
    difficulty: "intermediate",
    estimatedMinutes: 8,
    code: `const hits = new Map();

function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"];
    const now = Date.now();

    if (!hits.has(ip)) {
      hits.set(ip, []);
    }
    const timestamps = hits.get(ip);
    timestamps.push(now);

    const recent = timestamps.filter((t) => now - t < windowMs);
    if (recent.length > maxRequests) {
      res.setStatus(429);
      return res.send("Too many requests");
    }
    next();
  };
}`,
    findings: [
      {
        lines: [5, 5],
        category: "security",
        title: "Client-controlled X-Forwarded-For is trusted blindly",
        explanation:
          "X-Forwarded-For is just a request header — an attacker sets a new random value on every request and gets a fresh bucket each time, bypassing the limit entirely. (And with no proxy, the header is undefined, so *all* clients share one bucket and legitimate users rate-limit each other.) Use req.ip with Express's `trust proxy` configured for your actual proxy depth.",
      },
      {
        lines: [12, 12],
        category: "performance",
        title: "Timestamps are appended forever and never pruned",
        explanation:
          "Old timestamps are filtered into `recent` for the check, but the filtered copy is never written back — the stored array grows unbounded for every IP that ever connects (a slow memory leak that also makes each request's filter scan longer). Write it back (`hits.set(ip, recent)` after pushing) or use a counter + window-reset timestamp.",
      },
      {
        lines: [15, 15],
        category: "logic-bug",
        title: "Off-by-one: the limit allows maxRequests + 1",
        explanation:
          "The current request was already pushed, so when the client is exactly at the limit, `recent.length > maxRequests` is false and the request passes — every window allows one extra request. Use `>=`, or push only after the check passes.",
      },
      {
        lines: [16, 16],
        category: "hallucinated-api",
        title: "Express responses have no setStatus()",
        explanation:
          "Express is `res.status(429)` — setStatus is Java servlet (HttpServletResponse.setStatus) vocabulary. This throws `res.setStatus is not a function` at the exact moment the limiter first needs to reject someone, taking the request down with a 500 instead of a 429.",
      },
      {
        lines: [17, 17],
        category: "edge-case",
        title: "The required Retry-After header is never sent",
        explanation:
          "The prompt asked for Retry-After so well-behaved clients know when to come back. Compute it from the oldest timestamp in the window: `res.set(\"Retry-After\", String(Math.ceil((recent[0] + windowMs - now) / 1000)))` before sending the 429.",
      },
    ],
  },
  {
    slug: "js-otp-token",
    title: "OTP + reset-token generator",
    prompt:
      "Generate a 6-digit one-time passcode and a URL-safe password-reset token, plus a verifyOtp(input, stored) helper. Both secrets must be cryptographically secure.",
    language: "javascript",
    difficulty: "beginner",
    estimatedMinutes: 6,
    code: `const crypto = require("crypto");

function generateOtp() {
  const otp = Math.floor(Math.random() * 1000000);
  return otp.toString();
}

function generateResetToken() {
  const bytes = crypto.randomBytes(32);
  return bytes.toBase64Url();
}

function verifyOtp(input, stored) {
  return input == stored;
}`,
    findings: [
      {
        lines: [4, 4],
        category: "security",
        title: "Math.random() is not cryptographically secure",
        explanation:
          "Math.random() is a seedable, predictable PRNG — an attacker who observes a few outputs can reconstruct the generator state and predict future OTPs. The prompt said cryptographically secure: use `crypto.randomInt(0, 1000000)` (which is also uniform, avoiding modulo bias).",
      },
      {
        lines: [5, 5],
        category: "edge-case",
        title: "OTPs under 100000 lose their leading zeros",
        explanation:
          "toString() of 42 is \"42\", not \"000042\" — about 10% of generated codes come out shorter than 6 digits, failing length validation on the verify side (or worse, being easier to brute-force). Pad it: `otp.toString().padStart(6, \"0\")`.",
      },
      {
        lines: [10, 10],
        category: "hallucinated-api",
        title: "Buffer has no toBase64Url() method",
        explanation:
          "Buffers encode via toString with an encoding name: `bytes.toString(\"base64url\")`. A method named toBase64Url doesn't exist (there IS a Uint8Array.prototype.toBase64({ alphabet: \"base64url\" }) in very new engines — exactly the kind of half-remembered blend that produces this hallucination) and throws on every reset request.",
      },
      {
        lines: [14, 14],
        category: "security",
        title: "Loose, non-constant-time comparison of secrets",
        explanation:
          "Two problems: `==` coerces types (verifyOtp(0, \"000000\")… don't ask), and short-circuiting string comparison leaks how many leading characters matched via timing. Compare fixed-length representations with crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) after normalizing both to strings of equal length.",
      },
    ],
  },
];
