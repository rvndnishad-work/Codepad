/**
 * "Review the AI's code" challenge bank, part 7: TypeScript (batch 2).
 *
 * IMPORTANT: finding `lines` anchors are 1-based line numbers into `code`
 * exactly as written (first char after the opening backtick = line 1).
 * Grader de-dupes marks BY LINE, so no two findings may share a line.
 * Run `npx tsx prisma/seed-review-challenges.ts --lint` after any edit.
 */
import type { CuratedReviewChallenge } from "./review-challenges.types";

export const REVIEW_CHALLENGES_7: CuratedReviewChallenge[] = [
  {
    slug: "ts-clamp",
    title: "clamp() number helper",
    prompt:
      "Write clamp(value, min, max) that constrains a number to the [min, max] range.",
    language: "typescript",
    difficulty: "beginner",
    estimatedMinutes: 4,
    code: `export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  } else if (value > max) {
    return min;
  }
  return value;
}`,
    findings: [
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "Above-max case returns min instead of max",
        explanation:
          "When value exceeds max, the function returns `min` — a copy-paste slip from the branch above. clamp(100, 0, 10) yields 0 instead of 10. Return `max` here.",
      },
      {
        lines: [1, 1],
        category: "edge-case",
        title: "min > max isn't guarded",
        explanation:
          "If the caller passes min > max (or NaN), the range is contradictory and the result is whichever branch happens to fire — clamp(5, 10, 0) returns 10. Consider validating min <= max (throw or swap), and note NaN comparisons are always false so a NaN value passes through unclamped.",
        points: 5,
      },
    ],
  },
  {
    slug: "ts-unique",
    title: "unique() array helper",
    prompt:
      "Write a typed unique<T>(items) that returns the array with duplicates removed, preserving first-seen order.",
    language: "typescript",
    difficulty: "beginner",
    estimatedMinutes: 5,
    code: `export function unique<T>(items: T[]): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (result.indexOf(item) === -1) {
      result.push(item);
    }
  }
  return result;
}

export const ids = unique([{ id: 1 }, { id: 1 }]);`,
    findings: [
      {
        lines: [4, 4],
        category: "performance",
        title: "indexOf makes this O(n²)",
        explanation:
          "For each item you scan the whole result array — quadratic on large inputs. For primitives, a Set is O(n): `return [...new Set(items)]`. (The Set approach also fixes the object case below for identity semantics, though not deep equality.)",
        points: 5,
      },
      {
        lines: [11, 11],
        category: "edge-case",
        title: "Objects are de-duped by reference, not value",
        explanation:
          "indexOf (and Set) compare objects by identity, so `[{id:1}, {id:1}]` are two different references and neither is removed — the result still has both. If value-equality is intended, dedupe by a derived key (`item.id`) via a Map.",
      },
    ],
  },
  {
    slug: "ts-discriminated-union",
    title: "Handle a result union",
    prompt:
      "Given a Result union type, write render(result) that returns a message for each variant. Adding a new variant later should be caught by the compiler.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `type Result =
  | { kind: "ok"; value: number }
  | { kind: "error"; message: string }
  | { kind: "loading" };

function render(result: Result): string {
  if (result.kind === "ok") {
    return "Value: " + result.value;
  } else if (result.kind === "error") {
    return "Error: " + result.message;
  }
  return "Unknown state";
}

function assertNever(x: any) {
  throw new Error("Unexpected: " + x);
}`,
    findings: [
      {
        lines: [12, 12],
        category: "logic-bug",
        title: "'loading' hits a generic fallback with no exhaustiveness check",
        explanation:
          "'loading' is a real, known variant but it's swept into the catch-all 'Unknown state' string instead of getting its own branch — and because the fallback is a plain return, adding a future variant like `{ kind: 'timeout' }` also compiles fine and silently lands here. Give loading an explicit branch, then replace the fallback with `return assertNever(result)` so TypeScript errors whenever a variant isn't narrowed to `never`.",
      },
      {
        lines: [15, 15],
        category: "logic-bug",
        title: "assertNever typed as `any` defeats its purpose",
        explanation:
          "For the exhaustiveness trick to work, the parameter must be `never`, not `any`: `function assertNever(x: never): never`. Typed as any it accepts anything, so the compiler never complains about an unhandled variant even if you call it.",
      },
    ],
  },
  {
    slug: "ts-debounce-generic",
    title: "Typed debounce",
    prompt:
      "Write a typed debounce<F>(fn, wait) that preserves the argument types of fn and cancels pending calls on each invocation.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `export function debounce<F extends (...args: any[]) => void>(
  fn: F,
  wait: number
) {
  let timer: number;

  return function (...args: Parameters<F>) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(args);
    }, wait);
  };
}`,
    findings: [
      {
        lines: [10, 10],
        category: "logic-bug",
        title: "Args passed as a single array, not spread",
        explanation:
          "fn(args) calls the target with one argument — the array — so a handler expecting (query, page) receives ([query, page], undefined). Spread it: `fn(...args)`.",
      },
      {
        lines: [7, 7],
        category: "edge-case",
        title: "`this` binding is lost",
        explanation:
          "The returned function is a normal function and calls `fn(...args)` with no receiver, so debouncing a method drops its `this`. Capture it — use `function (this: unknown, ...)` and `fn.apply(this, args)` — or document that only unbound functions are supported.",
        points: 5,
      },
      {
        lines: [5, 5],
        category: "logic-bug",
        title: "timer typed as number is wrong in Node",
        explanation:
          "In the DOM setTimeout returns a number, but under @types/node it returns a Timeout object — `let timer: number` fails to compile (or needs a wrong cast) in a Node/isomorphic context. Use `ReturnType<typeof setTimeout>` so it's correct in both environments.",
      },
    ],
  },
  {
    slug: "ts-safe-json-parse",
    title: "Typed safeJsonParse",
    prompt:
      "Write safeJsonParse<T>(text) that parses JSON and returns the value typed as T, or null on failure. Never throw.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `export function safeJsonParse<T>(text: string): T {
  try {
    const value = JSON.parse(text);
    return value as T;
  } catch {
    return null;
  }
}

const config = safeJsonParse<{ port: number }>(localStorage.getItem("cfg"));
console.log(config.port);`,
    findings: [
      {
        lines: [1, 1],
        category: "logic-bug",
        title: "Return type ignores the null path",
        explanation:
          "The signature promises `T` but line 6 returns null — which only compiles because strictNullChecks is presumably off (or via an implicit any). The honest type is `T | null`, which then forces callers to handle the failure case.",
      },
      {
        lines: [4, 4],
        category: "security",
        title: "`as T` is an unchecked lie about the shape",
        explanation:
          "The cast asserts the parsed value matches T without verifying it — malformed or malicious JSON that parses successfully (e.g. `{}` or a hostile object) is trusted as a valid config. For untrusted input, validate with a schema (zod/valibot) and return the parsed-and-checked type.",
      },
      {
        lines: [10, 11],
        category: "edge-case",
        title: "localStorage.getItem can be null; config can be null",
        explanation:
          "getItem returns `string | null`, so this passes null into a string param, and safeJsonParse can itself return null — yet line 11 accesses config.port unguarded, crashing with 'Cannot read properties of null'. Guard both: default the text to '' and null-check config before use.",
      },
    ],
  },
  {
    slug: "ts-use-debounced-value",
    title: "useDebouncedValue hook",
    prompt:
      "React + TS: useDebouncedValue(value, delay) returns the value after it stops changing for `delay` ms.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 7,
    code: `import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
  }, [value]);

  return debounced;
}`,
    findings: [
      {
        lines: [7, 7],
        category: "logic-bug",
        title: "No cleanup — the timer is never cancelled",
        explanation:
          "The effect schedules a timeout but returns no cleanup, so every value change stacks another pending setDebounced instead of cancelling the previous one — you get the classic 'every intermediate value eventually lands' bug. Return `() => clearTimeout(id)`.",
      },
      {
        lines: [8, 8],
        category: "edge-case",
        title: "delay is missing from the dependency array",
        explanation:
          "Only [value] is listed, so if the caller changes `delay` at runtime the effect keeps using the stale delay until the next value change. Include it: `[value, delay]` (and it also silences the exhaustive-deps lint).",
        points: 5,
      },
    ],
  },
  {
    slug: "ts-config-merge",
    title: "Merge partial config over defaults",
    prompt:
      "Write mergeConfig(defaults, overrides) that deep-merges a partial overrides object over defaults, returning a fully-typed Config.",
    language: "typescript",
    difficulty: "advanced",
    estimatedMinutes: 8,
    code: `interface Config {
  server: { host: string; port: number };
  flags: string[];
}

function mergeConfig(defaults: Config, overrides: Partial<Config>): Config {
  return { ...defaults, ...overrides };
}

const cfg = mergeConfig(
  { server: { host: "localhost", port: 3000 }, flags: [] },
  { server: { port: 8080 } as Config["server"] }
);`,
    findings: [
      {
        lines: [7, 7],
        category: "logic-bug",
        title: "Spread is a shallow merge, not deep",
        explanation:
          "`{ ...defaults, ...overrides }` replaces `server` wholesale when overrides.server is present — so overriding just the port drops the default host, leaving host undefined at runtime. A nested merge is required: recurse into object-valued keys (or use a vetted deep-merge).",
      },
      {
        lines: [12, 12],
        category: "logic-bug",
        title: "`as Config['server']` hides the missing host",
        explanation:
          "The cast tells the compiler `{ port: 8080 }` is a complete server config, silencing the very error that would have revealed the shallow-merge bug. Without the cast, Partial<Config> would require server to be a full object (or the type should be a DeepPartial). Remove the assertion and model overrides as DeepPartial<Config>.",
      },
      {
        lines: [6, 6],
        category: "edge-case",
        title: "flags array is replaced, not concatenated",
        explanation:
          "Even with a proper deep merge, arrays need an explicit policy: overrides.flags will overwrite defaults.flags entirely. Decide and document whether arrays replace or concat — silent replacement of a defaults list is a common surprise.",
        points: 5,
      },
    ],
  },
  {
    slug: "ts-event-bus",
    title: "Typed event bus",
    prompt:
      "Write a typed EventBus keyed by an event-map interface: on(event, handler) and emit(event, payload) with payloads type-checked per event.",
    language: "typescript",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `type EventMap = {
  login: { userId: string };
  logout: void;
};

class EventBus {
  private handlers: Record<string, Function[]> = {};

  on(event: string, handler: Function) {
    (this.handlers[event] ||= []).push(handler);
  }

  emit(event: string, payload: any) {
    this.handlers[event].forEach((h) => h(payload));
  }
}

const bus = new EventBus();
bus.on("login", (p) => console.log(p.userId));
bus.emit("login", { userId: 123 });`,
    findings: [
      {
        lines: [9, 13],
        category: "logic-bug",
        title: "Signatures use `string`/`any` — no per-event type safety",
        explanation:
          "The whole point was payloads checked against EventMap, but on/emit take `string` and `any`, so `bus.emit('login', { userId: 123 })` (a number) compiles despite the map saying string, and `p` is `any`. Make the class generic over the map: `on<K extends keyof EventMap>(event: K, handler: (p: EventMap[K]) => void)`.",
      },
      {
        lines: [14, 14],
        category: "edge-case",
        title: "emit crashes for an event with no handlers",
        explanation:
          "If nobody subscribed, `this.handlers[event]` is undefined and .forEach throws. Emitting an unheard event should be a no-op: `(this.handlers[event] ?? []).forEach(...)`.",
      },
      {
        lines: [19, 19],
        category: "logic-bug",
        title: "userId passed as a number violates the event map",
        explanation:
          "EventMap.login.userId is a string, but this emits `123`. With the untyped signatures above it slips through; the consumer on line 18 then does string operations on a number. Fixing the generics surfaces this as a compile error — which is exactly the safety the prompt asked for.",
      },
    ],
  },
  {
    slug: "ts-paginate",
    title: "Paginate an array",
    prompt:
      "Write paginate<T>(items, page, pageSize) returning { data, totalPages, hasNext }. page is 1-based.",
    language: "typescript",
    difficulty: "intermediate",
    estimatedMinutes: 6,
    code: `export function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = page * pageSize;
  const data = items.slice(start, start + pageSize);
  const totalPages = items.length / pageSize;
  return {
    data,
    totalPages,
    hasNext: page < totalPages,
  };
}`,
    findings: [
      {
        lines: [2, 2],
        category: "logic-bug",
        title: "1-based page not converted to a 0-based offset",
        explanation:
          "With page 1-based, `start = page * pageSize` skips the first page entirely (page 1 starts at pageSize, not 0). It should be `(page - 1) * pageSize`.",
      },
      {
        lines: [4, 4],
        category: "logic-bug",
        title: "totalPages needs Math.ceil",
        explanation:
          "Plain division gives fractional pages — 25 items / 10 = 2.5, but there are 3 pages. Use `Math.ceil(items.length / pageSize)`, and guard pageSize <= 0 to avoid Infinity/NaN.",
      },
      {
        lines: [3, 3],
        category: "edge-case",
        title: "Out-of-range or non-integer page isn't handled",
        explanation:
          "page = 0, a negative, or a fractional value silently produces a wrong/empty slice with no signal. Clamp page to [1, totalPages] (and floor it) so callers get a predictable page rather than empty data.",
        points: 5,
      },
    ],
  },
  {
    slug: "ts-retry-decorator",
    title: "Retry wrapper with backoff",
    prompt:
      "Write retry(fn, options) that returns a wrapped async function retrying on failure up to maxAttempts with exponential backoff; only retry errors the shouldRetry predicate approves.",
    language: "typescript",
    difficulty: "advanced",
    estimatedMinutes: 9,
    code: `interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  shouldRetry?: (err: unknown) => boolean;
}

export function retry<T>(fn: () => Promise<T>, options: RetryOptions) {
  return async (): Promise<T> => {
    for (let attempt = 1; attempt < options.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (options.shouldRetry && !options.shouldRetry(err)) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, options.baseDelayMs));
      }
    }
    return await fn();
  };
}`,
    findings: [
      {
        lines: [9, 9],
        category: "logic-bug",
        title: "Off-by-one: maxAttempts=3 runs the loop only twice",
        explanation:
          "`attempt < maxAttempts` iterates 1..maxAttempts-1, then line 19 runs one final unguarded call. That final call bypasses shouldRetry and, worse, if it throws the error is correct — but the total tries are miscounted around edge values (maxAttempts=1 skips the loop entirely and still calls fn once, which is right by luck; maxAttempts=0 still calls once). Use `attempt <= maxAttempts` and drop the trailing call, rethrowing after the last attempt.",
      },
      {
        lines: [16, 16],
        category: "logic-bug",
        title: "Delay is constant, not exponential",
        explanation:
          "The prompt asked for exponential backoff but the wait is always baseDelayMs. Scale it by attempt: `baseDelayMs * 2 ** (attempt - 1)` (ideally plus jitter to avoid thundering-herd retries).",
      },
      {
        lines: [19, 19],
        category: "edge-case",
        title: "Final attempt isn't subject to shouldRetry and can double-call",
        explanation:
          "The trailing `return await fn()` is a separate code path from the loop: it ignores shouldRetry and, combined with the loop, changes how many total calls happen. Restructure so there's a single call site inside the loop that rethrows the captured error after the last permitted attempt — no duplicated final invocation.",
      },
    ],
  },
];
