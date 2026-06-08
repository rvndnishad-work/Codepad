/**
 * Seed script: Frontend JS/TS utility & async challenges (judgingMode "unit-js").
 * Source: GreatFrontEnd-style function-implementation questions.
 *
 * Run with: npx tsx prisma/seed-frontend-utils.ts
 *
 * These are single-language (TypeScript) challenges graded by the server-side
 * unit-js runner (src/lib/judge/unit-js.ts), which bundles the candidate's
 * source + these hidden Jest-style tests and runs them on Piston.
 *
 * IMPORTANT — the unit-js test shim supports only a Jest SUBSET: describe/test/
 * it, expect(...).toBe/toEqual/toThrow/.not/.resolves/.rejects/toBeLessThanOrEqual
 * etc. There is NO `jest` object (no jest.fn / fake timers) and beforeEach is a
 * no-op. So tests here use plain counters/arrays and real setTimeout with
 * forgiving margins instead of spies/fake timers.
 *
 * Idempotent: upserts Challenge + its single ChallengeStep by slug/position.
 * Exports FRONTEND_UTILS so the verification harness can run the hidden tests
 * against reference solutions without a DB.
 */
import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

export type Util = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  estimatedMinutes: number;
  description: string;
  /** Candidate-visible stub (/index.ts). */
  starter: string;
  /** Hidden Jest-subset tests (/index.test.ts). */
  tests: string;
};

export const FRONTEND_UTILS: Util[] = [
  {
    slug: "fe-flatten",
    title: "Flatten",
    difficulty: "easy",
    topics: ["arrays", "recursion"],
    estimatedMinutes: 15,
    description:
      "Implement `flatten(arr)` that takes a deeply nested array of numbers and returns a single flat array, in order. Do **not** use `Array.prototype.flat`.\n\n```ts\nflatten([1, [2, [3, [4]], 5]]) // => [1, 2, 3, 4, 5]\n```",
    starter: `type Nested = number | Nested[];

export function flatten(arr: Nested[]): number[] {
  // TODO: implement (without Array.prototype.flat)
  return [];
}
`,
    tests: `import { flatten } from "./index";

describe("flatten", () => {
  it("leaves a flat array unchanged", () => {
    expect(flatten([1, 2, 3])).toEqual([1, 2, 3]);
  });
  it("flattens one level", () => {
    expect(flatten([1, [2, 3], 4])).toEqual([1, 2, 3, 4]);
  });
  it("flattens deeply", () => {
    expect(flatten([1, [2, [3, [4, [5]]]]])).toEqual([1, 2, 3, 4, 5]);
  });
  it("handles empty arrays", () => {
    expect(flatten([])).toEqual([]);
    expect(flatten([[], [[], []]])).toEqual([]);
  });
});
`,
  },
  {
    slug: "fe-classnames",
    title: "Classnames",
    difficulty: "easy",
    topics: ["strings", "objects"],
    estimatedMinutes: 15,
    description:
      "Implement `classNames(...args)` — the classic conditional class joiner. Accept strings, numbers, arrays (recursively), and objects (`{ cls: boolean }`). Ignore falsy values. Return a space-separated string.\n\n```ts\nclassNames('a', { b: true, c: false }, ['d']) // => 'a b d'\n```",
    starter: `type ClassValue =
  | string
  | number
  | null
  | undefined
  | boolean
  | ClassValue[]
  | Record<string, boolean>;

export function classNames(...args: ClassValue[]): string {
  // TODO: implement
  return "";
}
`,
    tests: `import { classNames } from "./index";

describe("classNames", () => {
  it("joins string args with spaces", () => {
    expect(classNames("a", "b", "c")).toBe("a b c");
  });
  it("ignores falsy values", () => {
    expect(classNames("a", null, undefined, false, 0, "", "b")).toBe("a b");
  });
  it("includes truthy object keys only", () => {
    expect(classNames({ a: true, b: false, c: true })).toBe("a c");
  });
  it("flattens nested arrays", () => {
    expect(classNames(["a", ["b", { c: true }]])).toBe("a b c");
  });
});
`,
  },
  {
    slug: "fe-compose",
    title: "Compose",
    difficulty: "easy",
    topics: ["functions"],
    estimatedMinutes: 15,
    description:
      "Implement `compose(...fns)` that returns a function applying `fns` **right to left**: `compose(f, g)(x) === f(g(x))`. With no functions it is the identity.\n\n```ts\ncompose(inc, double)(5) // => inc(double(5)) = 11\n```",
    starter: `export function compose(
  ...fns: Array<(x: any) => any>
): (x: any) => any {
  // TODO: implement (right-to-left)
  return (x: any) => x;
}
`,
    tests: `import { compose } from "./index";

describe("compose", () => {
  it("applies functions right to left", () => {
    const inc = (x: number) => x + 1;
    const dbl = (x: number) => x * 2;
    expect(compose(inc, dbl)(5)).toBe(11);
  });
  it("composes three functions", () => {
    const inc = (x: number) => x + 1;
    const dbl = (x: number) => x * 2;
    const neg = (x: number) => -x;
    expect(compose(neg, inc, dbl)(3)).toBe(-7);
  });
  it("is the identity with no functions", () => {
    expect(compose()(42)).toBe(42);
  });
});
`,
  },
  {
    slug: "fe-curry",
    title: "Curry",
    difficulty: "medium",
    topics: ["functions", "closures"],
    estimatedMinutes: 20,
    description:
      "Implement `curry(fn)` returning a curried version of `fn`. It collects arguments across calls until at least `fn.length` are supplied, then invokes `fn`. Partial applications must be reusable and independent.\n\n```ts\nconst sum = (a, b, c) => a + b + c;\ncurry(sum)(1)(2)(3); // 6\ncurry(sum)(1, 2)(3); // 6\n```",
    starter: `export function curry(
  fn: (...args: any[]) => any
): (...args: any[]) => any {
  // TODO: implement
  return () => {};
}
`,
    tests: `import { curry } from "./index";

describe("curry", () => {
  const sum3 = (a: number, b: number, c: number) => a + b + c;
  it("works when all args are passed at once", () => {
    expect(curry(sum3)(1, 2, 3)).toBe(6);
  });
  it("works one argument at a time", () => {
    expect(curry(sum3)(1)(2)(3)).toBe(6);
  });
  it("works with mixed grouping", () => {
    const c = curry(sum3);
    expect(c(1, 2)(3)).toBe(6);
    expect(c(1)(2, 3)).toBe(6);
  });
  it("supports independent reuse of partials", () => {
    const c = curry(sum3);
    const addOne = c(1);
    expect(addOne(2)(3)).toBe(6);
    expect(addOne(10)(20)).toBe(31);
  });
});
`,
  },
  {
    slug: "fe-deep-clone",
    title: "Deep Clone",
    difficulty: "medium",
    topics: ["objects", "recursion"],
    estimatedMinutes: 20,
    description:
      "Implement `deepClone(value)` returning a deep copy: nested objects and arrays are cloned (not shared), primitives pass through. (You may assume JSON-safe data: no functions, Dates, Maps, or cycles.)",
    starter: `export function deepClone<T>(value: T): T {
  // TODO: implement
  return value;
}
`,
    tests: `import { deepClone } from "./index";

describe("deepClone", () => {
  it("produces an equal but distinct structure", () => {
    const o = { a: 1, b: { c: 2, d: [3, 4] } };
    const c = deepClone(o);
    expect(c).toEqual(o);
    expect(c === o).toBe(false);
    expect(c.b === o.b).toBe(false);
    expect(c.b.d === o.b.d).toBe(false);
  });
  it("clones arrays deeply", () => {
    const a = [1, [2, 3], { x: 4 }];
    const c = deepClone(a);
    expect(c).toEqual(a);
    expect(c[1] === a[1]).toBe(false);
  });
  it("mutating the clone does not affect the original", () => {
    const o = { a: { b: 1 } };
    const c = deepClone(o);
    c.a.b = 99;
    expect(o.a.b).toBe(1);
  });
  it("passes primitives through", () => {
    expect(deepClone(5)).toBe(5);
    expect(deepClone("hi")).toBe("hi");
    expect(deepClone(null)).toBe(null);
  });
});
`,
  },
  {
    slug: "fe-deep-equal",
    title: "Deep Equal",
    difficulty: "medium",
    topics: ["objects", "recursion"],
    estimatedMinutes: 20,
    description:
      "Implement `deepEqual(a, b)` returning `true` when two JSON-safe values are structurally equal — same primitives, same array contents, same object keys and values (recursively).",
    starter: `export function deepEqual(a: unknown, b: unknown): boolean {
  // TODO: implement
  return false;
}
`,
    tests: `import { deepEqual } from "./index";

describe("deepEqual", () => {
  it("compares primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "a")).toBe(true);
  });
  it("compares nested structures", () => {
    expect(deepEqual({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } })).toBe(true);
    expect(deepEqual({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 3] } })).toBe(false);
  });
  it("detects differing key sets", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
  it("compares arrays by length and content", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });
});
`,
  },
  {
    slug: "fe-memoize",
    title: "Memoize",
    difficulty: "medium",
    topics: ["functions", "caching"],
    estimatedMinutes: 20,
    description:
      "Implement `memoize(fn)` returning a function that caches results by its arguments, so repeated calls with the same arguments don't re-run `fn`. (Assume JSON-serializable arguments.)",
    starter: `export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R
): (...args: A) => R {
  // TODO: implement
  return fn;
}
`,
    tests: `import { memoize } from "./index";

describe("memoize", () => {
  it("returns the correct result", () => {
    const add = (a: number, b: number) => a + b;
    const m = memoize(add);
    expect(m(2, 3)).toBe(5);
  });
  it("caches by arguments (does not recompute)", () => {
    let calls = 0;
    const add = (a: number, b: number) => {
      calls++;
      return a + b;
    };
    const m = memoize(add);
    m(1, 2);
    m(1, 2);
    m(1, 2);
    expect(calls).toBe(1);
  });
  it("recomputes for different arguments", () => {
    let calls = 0;
    const sq = (a: number) => {
      calls++;
      return a * a;
    };
    const m = memoize(sq);
    m(2);
    m(3);
    m(2);
    expect(calls).toBe(2);
  });
});
`,
  },
  {
    slug: "fe-event-emitter",
    title: "Event Emitter",
    difficulty: "medium",
    topics: ["classes", "pub-sub"],
    estimatedMinutes: 25,
    description:
      "Implement an `EventEmitter` class with `on(event, cb)`, `off(event, cb)`, and `emit(event, ...args)`. `emit` calls every subscriber for that event with the provided args. `off` removes a previously-registered callback.",
    starter: `export class EventEmitter {
  on(event: string, cb: (...args: any[]) => void): void {
    // TODO
  }
  off(event: string, cb: (...args: any[]) => void): void {
    // TODO
  }
  emit(event: string, ...args: any[]): void {
    // TODO
  }
}
`,
    tests: `import { EventEmitter } from "./index";

describe("EventEmitter", () => {
  it("delivers emitted args to subscribers", () => {
    const e = new EventEmitter();
    let got: number[] = [];
    e.on("sum", (...args: number[]) => {
      got = args;
    });
    e.emit("sum", 1, 2, 3);
    expect(got).toEqual([1, 2, 3]);
  });
  it("supports multiple subscribers", () => {
    const e = new EventEmitter();
    let count = 0;
    e.on("ping", () => {
      count++;
    });
    e.on("ping", () => {
      count++;
    });
    e.emit("ping");
    expect(count).toBe(2);
  });
  it("off() removes a listener", () => {
    const e = new EventEmitter();
    let count = 0;
    const fn = () => {
      count++;
    };
    e.on("x", fn);
    e.off("x", fn);
    e.emit("x");
    expect(count).toBe(0);
  });
  it("only notifies the matching event", () => {
    const e = new EventEmitter();
    let count = 0;
    e.on("a", () => {
      count++;
    });
    e.emit("b");
    expect(count).toBe(0);
  });
});
`,
  },
  {
    slug: "fe-promise-all",
    title: "Promise.all",
    difficulty: "medium",
    topics: ["async", "promises"],
    estimatedMinutes: 20,
    description:
      "Implement `promiseAll(promises)` mirroring `Promise.all`: resolve to an array of results in the **same order** as the input (regardless of settle order), or reject as soon as any input rejects. Resolve to `[]` for an empty input.",
    starter: `export function promiseAll<T>(promises: Array<Promise<T>>): Promise<T[]> {
  // TODO: implement
  return Promise.resolve([] as T[]);
}
`,
    tests: `import { promiseAll } from "./index";

describe("promiseAll", () => {
  it("resolves with values in input order", async () => {
    const r = await promiseAll([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    expect(r).toEqual([1, 2, 3]);
  });
  it("preserves order regardless of timing", async () => {
    const slow: Promise<number> = new Promise((res) => setTimeout(() => res(1), 30));
    const fast: Promise<number> = Promise.resolve(2);
    const r = await promiseAll([slow, fast]);
    expect(r).toEqual([1, 2]);
  });
  it("resolves to an empty array for empty input", async () => {
    const r = await promiseAll<number>([]);
    expect(r).toEqual([]);
  });
  it("rejects if any promise rejects", async () => {
    await expect(
      promiseAll([Promise.resolve(1), Promise.reject(new Error("boom"))])
    ).rejects.toThrow("boom");
  });
});
`,
  },
  {
    slug: "fe-promise-race",
    title: "Promise.race",
    difficulty: "medium",
    topics: ["async", "promises"],
    estimatedMinutes: 20,
    description:
      "Implement `promiseRace(promises)` mirroring `Promise.race`: settle with the **first** input promise to settle — resolving if it resolves, rejecting if it rejects.",
    starter: `export function promiseRace<T>(promises: Array<Promise<T>>): Promise<T> {
  // TODO: implement
  return new Promise<T>(() => {});
}
`,
    tests: `import { promiseRace } from "./index";

describe("promiseRace", () => {
  it("settles with the first resolved value", async () => {
    const slow: Promise<string> = new Promise((res) => setTimeout(() => res("slow"), 50));
    const fast: Promise<string> = new Promise((res) => setTimeout(() => res("fast"), 10));
    const r = await promiseRace([slow, fast]);
    expect(r).toBe("fast");
  });
  it("rejects if the first settled rejects", async () => {
    const slow: Promise<string> = new Promise((res) => setTimeout(() => res("slow"), 50));
    const fail: Promise<string> = new Promise((_res, rej) => setTimeout(() => rej(new Error("nope")), 10));
    await expect(promiseRace([slow, fail])).rejects.toThrow("nope");
  });
});
`,
  },
  {
    slug: "fe-promisify",
    title: "Promisify",
    difficulty: "medium",
    topics: ["async", "promises"],
    estimatedMinutes: 20,
    description:
      "Implement `promisify(fn)` that converts a Node-style callback function (whose **last** argument is `(error, value) => void`) into one that returns a Promise — resolving with `value`, or rejecting with `error`.",
    starter: `export function promisify(
  fn: (...args: any[]) => void
): (...args: any[]) => Promise<any> {
  // TODO: fn's last arg is a callback (err, value) => void
  return () => Promise.reject(new Error("not implemented"));
}
`,
    tests: `import { promisify } from "./index";

describe("promisify", () => {
  it("resolves with the callback value", async () => {
    const add = (a: number, b: number, cb: (err: unknown, val: number) => void) => cb(null, a + b);
    const padd = promisify(add);
    const r = await padd(2, 3);
    expect(r).toBe(5);
  });
  it("rejects when the callback receives an error", async () => {
    const fail = (cb: (err: unknown) => void) => cb(new Error("bad"));
    const pfail = promisify(fail);
    await expect(pfail()).rejects.toThrow("bad");
  });
});
`,
  },
  {
    slug: "fe-map-async-limit",
    title: "Map Async with Concurrency Limit",
    difficulty: "hard",
    topics: ["async", "concurrency"],
    estimatedMinutes: 35,
    description:
      "Implement `mapAsyncLimit(items, limit, iteratee)` that runs `iteratee(item)` over every item, never running more than `limit` at once, and resolves with the results in the **same order** as `items`.\n\n```ts\nawait mapAsyncLimit([1,2,3,4], 2, async (x) => x * 2); // [2,4,6,8]\n```",
    starter: `export function mapAsyncLimit<T, R>(
  items: T[],
  limit: number,
  iteratee: (item: T) => Promise<R>
): Promise<R[]> {
  // TODO: implement (max \`limit\` concurrent, order preserved)
  return Promise.resolve([] as R[]);
}
`,
    tests: `import { mapAsyncLimit } from "./index";

describe("mapAsyncLimit", () => {
  it("maps values preserving order", async () => {
    const r = await mapAsyncLimit([1, 2, 3, 4], 2, async (x: number) => x * 2);
    expect(r).toEqual([2, 4, 6, 8]);
  });
  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    const task = async (x: number) => {
      active++;
      if (active > peak) peak = active;
      await new Promise((res) => setTimeout(res, 15));
      active--;
      return x;
    };
    const r = await mapAsyncLimit([1, 2, 3, 4, 5, 6], 2, task);
    expect(r).toEqual([1, 2, 3, 4, 5, 6]);
    expect(peak).toBeLessThanOrEqual(2);
  });
  it("handles empty input", async () => {
    const r = await mapAsyncLimit<number, number>([], 3, async (x: number) => x);
    expect(r).toEqual([]);
  });
});
`,
  },
  {
    slug: "fe-debounce",
    title: "Debounce",
    difficulty: "medium",
    topics: ["timing", "closures"],
    estimatedMinutes: 20,
    description:
      "Implement `debounce(fn, wait)` returning a debounced function that delays calling `fn` until `wait` ms have passed since the **last** call, using the most recent arguments. Use `setTimeout`.",
    starter: `export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
): (...args: A) => void {
  // TODO: implement
  return (..._args: A) => {};
}
`,
    tests: `import { debounce } from "./index";

describe("debounce", () => {
  it("does not invoke before the wait elapses, then fires once", async () => {
    let calls = 0;
    const d = debounce(() => {
      calls++;
    }, 40);
    d();
    d();
    d();
    expect(calls).toBe(0);
    await new Promise((r) => setTimeout(r, 90));
    expect(calls).toBe(1);
  });
  it("uses the most recent arguments", async () => {
    let last: number[] = [];
    const d = debounce((...args: number[]) => {
      last = args;
    }, 30);
    d(1, 2);
    d(3, 4);
    await new Promise((r) => setTimeout(r, 80));
    expect(last).toEqual([3, 4]);
  });
  it("can fire again after settling", async () => {
    let calls = 0;
    const d = debounce(() => {
      calls++;
    }, 30);
    d();
    await new Promise((r) => setTimeout(r, 70));
    d();
    await new Promise((r) => setTimeout(r, 70));
    expect(calls).toBe(2);
  });
});
`,
  },
  {
    slug: "fe-throttle",
    title: "Throttle",
    difficulty: "medium",
    topics: ["timing", "closures"],
    estimatedMinutes: 20,
    description:
      "Implement `throttle(fn, wait)` (**leading edge**): invoke `fn` immediately on the first call, then ignore further calls until `wait` ms have passed; after that the next call invokes again. Use `setTimeout`.",
    starter: `export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number
): (...args: A) => void {
  // TODO: implement (leading edge)
  return (..._args: A) => {};
}
`,
    tests: `import { throttle } from "./index";

describe("throttle", () => {
  it("invokes immediately on the first call", () => {
    let calls = 0;
    const t = throttle(() => {
      calls++;
    }, 50);
    t();
    expect(calls).toBe(1);
  });
  it("ignores calls within the window", () => {
    let calls = 0;
    const t = throttle(() => {
      calls++;
    }, 50);
    t();
    t();
    t();
    expect(calls).toBe(1);
  });
  it("allows another call after the window passes", async () => {
    let calls = 0;
    const t = throttle(() => {
      calls++;
    }, 40);
    t();
    await new Promise((r) => setTimeout(r, 80));
    t();
    expect(calls).toBe(2);
  });
  it("passes arguments through", () => {
    let received: number[] = [];
    const t = throttle((...args: number[]) => {
      received = args;
    }, 50);
    t(7, 8);
    expect(received).toEqual([7, 8]);
  });
});
`,
  },
  {
    slug: "fe-array-map",
    title: "Array.prototype.map",
    difficulty: "easy",
    topics: ["arrays", "higher-order"],
    estimatedMinutes: 15,
    description:
      "Implement `map(arr, fn)` mirroring `Array.prototype.map`: return a new array where each element is `fn(value, index, array)`.",
    starter: `export function map<T, U>(
  arr: T[],
  fn: (value: T, index: number, array: T[]) => U
): U[] {
  // TODO: implement
  return [];
}
`,
    tests: `import { map } from "./index";

describe("map", () => {
  it("transforms each element", () => {
    expect(map([1, 2, 3], (x) => x * 2)).toEqual([2, 4, 6]);
  });
  it("passes the index", () => {
    expect(map([10, 20, 30], (_v, i) => i)).toEqual([0, 1, 2]);
  });
  it("handles empty arrays", () => {
    expect(map([], (x) => x)).toEqual([]);
  });
});
`,
  },
  {
    slug: "fe-array-filter",
    title: "Array.prototype.filter",
    difficulty: "easy",
    topics: ["arrays", "higher-order"],
    estimatedMinutes: 15,
    description:
      "Implement `filter(arr, fn)` mirroring `Array.prototype.filter`: return a new array of the elements for which `fn(value, index, array)` is truthy.",
    starter: `export function filter<T>(
  arr: T[],
  fn: (value: T, index: number, array: T[]) => boolean
): T[] {
  // TODO: implement
  return [];
}
`,
    tests: `import { filter } from "./index";

describe("filter", () => {
  it("keeps elements passing the predicate", () => {
    expect(filter([1, 2, 3, 4], (x) => x % 2 === 0)).toEqual([2, 4]);
  });
  it("passes the index", () => {
    expect(filter([5, 6, 7], (_v, i) => i > 0)).toEqual([6, 7]);
  });
  it("handles empty arrays", () => {
    expect(filter([], () => true)).toEqual([]);
  });
});
`,
  },
  {
    slug: "fe-array-reduce",
    title: "Array.prototype.reduce",
    difficulty: "medium",
    topics: ["arrays", "higher-order"],
    estimatedMinutes: 20,
    description:
      "Implement `reduce(arr, fn, initial)` mirroring `Array.prototype.reduce` with a required initial value: fold the array left-to-right with `acc = fn(acc, value, index, array)`.",
    starter: `export function reduce<T, U>(
  arr: T[],
  fn: (acc: U, value: T, index: number, array: T[]) => U,
  initial: U
): U {
  // TODO: implement
  return initial;
}
`,
    tests: `import { reduce } from "./index";

describe("reduce", () => {
  it("sums with an initial value", () => {
    expect(reduce([1, 2, 3, 4], (a, b) => a + b, 0)).toBe(10);
  });
  it("can build other types", () => {
    expect(reduce(["a", "b", "c"], (a, b) => a + b, "")).toBe("abc");
  });
  it("returns the initial for empty input", () => {
    expect(reduce([], (a, b) => a + b, 42)).toBe(42);
  });
});
`,
  },
  {
    slug: "fe-pipe",
    title: "Pipe",
    difficulty: "easy",
    topics: ["functions"],
    estimatedMinutes: 15,
    description:
      "Implement `pipe(...fns)` that returns a function applying `fns` **left to right**: `pipe(f, g)(x) === g(f(x))`. With no functions it is the identity.",
    starter: `export function pipe(...fns: Array<(x: any) => any>): (x: any) => any {
  // TODO: implement (left-to-right)
  return (x: any) => x;
}
`,
    tests: `import { pipe } from "./index";

describe("pipe", () => {
  it("applies functions left to right", () => {
    const inc = (x: number) => x + 1;
    const dbl = (x: number) => x * 2;
    expect(pipe(inc, dbl)(5)).toBe(12);
  });
  it("composes three", () => {
    const inc = (x: number) => x + 1;
    const dbl = (x: number) => x * 2;
    const neg = (x: number) => -x;
    expect(pipe(dbl, inc, neg)(3)).toBe(-7);
  });
  it("is identity with no functions", () => {
    expect(pipe()(42)).toBe(42);
  });
});
`,
  },
  {
    slug: "fe-chunk",
    title: "Chunk",
    difficulty: "easy",
    topics: ["arrays"],
    estimatedMinutes: 15,
    description:
      "Implement `chunk(arr, size)` that splits `arr` into groups of length `size` (the last group may be shorter).\n\n```ts\nchunk([1,2,3,4,5], 2) // => [[1,2],[3,4],[5]]\n```",
    starter: `export function chunk<T>(arr: T[], size: number): T[][] {
  // TODO: implement
  return [];
}
`,
    tests: `import { chunk } from "./index";

describe("chunk", () => {
  it("splits into groups of size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it("returns one chunk when size exceeds length", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
  it("handles exact division", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });
  it("handles empty arrays", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
`,
  },
  {
    slug: "fe-list-format",
    title: "List Format",
    difficulty: "easy",
    topics: ["strings"],
    estimatedMinutes: 15,
    description:
      "Implement `listFormat(items)` that joins a list of strings into human-readable form with an Oxford comma:\n\n```\n[]                       => \"\"\n[\"a\"]                    => \"a\"\n[\"a\",\"b\"]               => \"a and b\"\n[\"a\",\"b\",\"c\"]           => \"a, b, and c\"\n```",
    starter: `export function listFormat(items: string[]): string {
  // TODO: implement
  return "";
}
`,
    tests: `import { listFormat } from "./index";

describe("listFormat", () => {
  it("returns empty string for no items", () => {
    expect(listFormat([])).toBe("");
  });
  it("returns a single item as-is", () => {
    expect(listFormat(["apple"])).toBe("apple");
  });
  it("joins two items with 'and'", () => {
    expect(listFormat(["apple", "banana"])).toBe("apple and banana");
  });
  it("uses an Oxford comma for three or more", () => {
    expect(listFormat(["apple", "banana", "cherry"])).toBe("apple, banana, and cherry");
  });
});
`,
  },
  {
    slug: "fe-deep-omit",
    title: "Deep Omit",
    difficulty: "medium",
    topics: ["objects", "recursion"],
    estimatedMinutes: 20,
    description:
      "Implement `deepOmit(value, keys)` that returns a deep copy of `value` with every property named in `keys` removed at any depth (recursing through objects and arrays). Primitives pass through.",
    starter: `export function deepOmit(value: any, keys: string[]): any {
  // TODO: implement
  return value;
}
`,
    tests: `import { deepOmit } from "./index";

describe("deepOmit", () => {
  it("removes keys at any depth", () => {
    expect(deepOmit({ a: 1, b: { c: 2, d: 3 } }, ["c"])).toEqual({ a: 1, b: { d: 3 } });
  });
  it("removes top-level keys", () => {
    expect(deepOmit({ a: 1, b: 2 }, ["a"])).toEqual({ b: 2 });
  });
  it("recurses through arrays", () => {
    expect(
      deepOmit({ items: [{ id: 1, secret: "x" }, { id: 2, secret: "y" }] }, ["secret"])
    ).toEqual({ items: [{ id: 1 }, { id: 2 }] });
  });
  it("leaves primitives untouched", () => {
    expect(deepOmit(5, ["a"])).toBe(5);
  });
});
`,
  },
  {
    slug: "fe-squash-object",
    title: "Squash Object",
    difficulty: "medium",
    topics: ["objects", "recursion"],
    estimatedMinutes: 25,
    description:
      "Implement `squash(obj)` that flattens a nested object into one level using dot-separated paths as keys. (Assume plain nested objects — no arrays.)\n\n```ts\nsquash({ a: { b: 1, c: { d: 2 } } }) // => { 'a.b': 1, 'a.c.d': 2 }\n```",
    starter: `export function squash(obj: Record<string, any>): Record<string, any> {
  // TODO: implement
  return {};
}
`,
    tests: `import { squash } from "./index";

describe("squash", () => {
  it("flattens nested objects to dot paths", () => {
    expect(squash({ a: { b: 1, c: { d: 2 } } })).toEqual({ "a.b": 1, "a.c.d": 2 });
  });
  it("leaves flat objects unchanged", () => {
    expect(squash({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  });
  it("handles empty objects", () => {
    expect(squash({})).toEqual({});
  });
});
`,
  },
  {
    slug: "fe-unsquash-object",
    title: "Unsquash Object",
    difficulty: "medium",
    topics: ["objects"],
    estimatedMinutes: 25,
    description:
      "Implement `unsquash(flat)` — the inverse of Squash Object: expand dot-separated keys back into a nested object.\n\n```ts\nunsquash({ 'a.b': 1, 'a.c.d': 2 }) // => { a: { b: 1, c: { d: 2 } } }\n```",
    starter: `export function unsquash(flat: Record<string, any>): Record<string, any> {
  // TODO: implement
  return {};
}
`,
    tests: `import { unsquash } from "./index";

describe("unsquash", () => {
  it("expands dot paths into nested objects", () => {
    expect(unsquash({ "a.b": 1, "a.c.d": 2 })).toEqual({ a: { b: 1, c: { d: 2 } } });
  });
  it("leaves flat keys flat", () => {
    expect(unsquash({ x: 1, y: 2 })).toEqual({ x: 1, y: 2 });
  });
  it("handles empty input", () => {
    expect(unsquash({})).toEqual({});
  });
});
`,
  },
  {
    slug: "fe-promise-any",
    title: "Promise.any",
    difficulty: "medium",
    topics: ["async", "promises"],
    estimatedMinutes: 25,
    description:
      "Implement `promiseAny(promises)` mirroring `Promise.any`: resolve with the first promise to fulfill (ignoring rejections). If every promise rejects, reject with an error whose message is `\"All promises were rejected\"`.",
    starter: `export function promiseAny<T>(promises: Array<Promise<T>>): Promise<T> {
  // TODO: implement
  return Promise.reject(new Error("not implemented"));
}
`,
    tests: `import { promiseAny } from "./index";

describe("promiseAny", () => {
  it("resolves with the first fulfilled value", async () => {
    const r = await promiseAny([Promise.reject(new Error("x")), Promise.resolve(2)]);
    expect(r).toBe(2);
  });
  it("ignores earlier rejections by timing", async () => {
    const slow: Promise<number> = new Promise((res) => setTimeout(() => res(1), 25));
    const failFast: Promise<number> = new Promise((_r, rej) => setTimeout(() => rej(new Error("nope")), 5));
    expect(await promiseAny([failFast, slow])).toBe(1);
  });
  it("rejects when all reject", async () => {
    await expect(
      promiseAny([Promise.reject(new Error("a")), Promise.reject(new Error("b"))])
    ).rejects.toThrow("All promises were rejected");
  });
});
`,
  },
  {
    slug: "fe-promise-all-settled",
    title: "Promise.allSettled",
    difficulty: "medium",
    topics: ["async", "promises"],
    estimatedMinutes: 25,
    description:
      "Implement `promiseAllSettled(promises)` mirroring `Promise.allSettled`: always resolve (never reject) with an array, in input order, of `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`.",
    starter: `export function promiseAllSettled<T>(
  promises: Array<Promise<T>>
): Promise<Array<{ status: "fulfilled"; value: T } | { status: "rejected"; reason: any }>> {
  // TODO: implement
  return Promise.resolve([]);
}
`,
    tests: `import { promiseAllSettled } from "./index";

describe("promiseAllSettled", () => {
  it("reports fulfilled and rejected outcomes in order", async () => {
    const r = await promiseAllSettled([Promise.resolve(1), Promise.reject(new Error("boom"))]);
    expect(r.length).toBe(2);
    expect(r[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(r[1].status).toBe("rejected");
    expect((r[1] as any).reason.message).toBe("boom");
  });
  it("resolves to empty for empty input", async () => {
    expect(await promiseAllSettled([])).toEqual([]);
  });
});
`,
  },
  {
    slug: "fe-json-stringify",
    title: "JSON.stringify",
    difficulty: "hard",
    topics: ["serialization", "recursion"],
    estimatedMinutes: 35,
    description:
      "Implement `jsonStringify(value)` for JSON-safe values (null, boolean, finite number, string, array, plain object) — matching `JSON.stringify`'s output, including string escaping and key order. (No need to handle functions, undefined, dates, or cycles.)",
    starter: `export function jsonStringify(value: any): string {
  // TODO: implement (match JSON.stringify for JSON-safe values)
  return "";
}
`,
    tests: `import { jsonStringify } from "./index";

describe("jsonStringify", () => {
  it("matches JSON.stringify across cases", () => {
    const cases: any[] = [
      42, -3.5, true, false, null, "hello",
      [1, 2, 3], ["a", "b"],
      { a: 1, b: "two", c: true, d: null },
      { nested: { x: [1, { y: 2 }] } },
    ];
    for (const c of cases) {
      expect(jsonStringify(c)).toBe(JSON.stringify(c));
    }
  });
  it("escapes special characters", () => {
    const tricky = "a" + String.fromCharCode(34) + String.fromCharCode(92) + String.fromCharCode(10) + "b";
    expect(jsonStringify(tricky)).toBe(JSON.stringify(tricky));
  });
});
`,
  },
];

async function main() {
  const prisma = new PrismaClient();
  let created = 0;
  for (const u of FRONTEND_UTILS) {
    const tags = ["frontend", "javascript", "typescript", ...u.topics];
    const challenge = await prisma.challenge.upsert({
      where: { slug: u.slug },
      update: {
        title: u.title,
        description: u.description,
        difficulty: u.difficulty,
        category: "Frontend",
        tags: JSON.stringify(tags),
        estimatedMinutes: u.estimatedMinutes,
        published: true,
        visibility: "public",
      },
      create: {
        slug: u.slug,
        title: u.title,
        description: u.description,
        difficulty: u.difficulty,
        template: "test-ts",
        starterFiles: JSON.stringify({ "/index.ts": u.starter }),
        testFiles: JSON.stringify({ "/index.test.ts": u.tests }),
        category: "Frontend",
        tags: JSON.stringify(tags),
        estimatedMinutes: u.estimatedMinutes,
        published: true,
        visibility: "public",
      },
      select: { id: true },
    });

    await prisma.challengeStep.upsert({
      where: { challengeId_position: { challengeId: challenge.id, position: 0 } },
      update: {
        description: u.description,
        template: "test-ts",
        estimatedMinutes: u.estimatedMinutes,
        judgingMode: "unit-js",
        starterFiles: JSON.stringify({ "/index.ts": u.starter }),
        testFiles: JSON.stringify({ "/index.test.ts": u.tests }),
      },
      create: {
        challengeId: challenge.id,
        position: 0,
        title: u.title,
        description: u.description,
        template: "test-ts",
        starterFiles: JSON.stringify({ "/index.ts": u.starter }),
        testFiles: JSON.stringify({ "/index.test.ts": u.tests }),
        estimatedMinutes: u.estimatedMinutes,
        judgingMode: "unit-js",
      },
    });

    created++;
    console.log(`  ✓ ${u.slug} (${u.difficulty})`);
  }
  console.log(`\nSeeded ${created} frontend utility challenges.`);
  await prisma.$disconnect();
}

// Only hit the DB when executed directly (not when imported by the verifier).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
