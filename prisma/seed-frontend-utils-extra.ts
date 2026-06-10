import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Util = {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  estimatedMinutes: number;
  description: string;
  starter: string;
  tests: string;
};

const UTILS: Util[] = [
  {
    slug: "fe-sleep",
    title: "Sleep",
    difficulty: "easy",
    topics: ["async", "promises"],
    estimatedMinutes: 10,
    description:
      "Implement an asynchronous `sleep(ms)` function that returns a Promise resolving after `ms` milliseconds.",
    starter: `export function sleep(ms: number): Promise<void> {
  // TODO: implement
  return Promise.resolve();
}
`,
    tests: `import { sleep } from "./index";

describe("sleep", () => {
  it("resolves after the specified time", async () => {
    const start = Date.now();
    await sleep(30);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(25);
  });
});
`,
  },
  {
    slug: "fe-once",
    title: "Once",
    difficulty: "easy",
    topics: ["functions", "closures"],
    estimatedMinutes: 15,
    description:
      "Implement a `once(fn)` wrapper function that restricts the execution of `fn` to exactly once. Subsequent calls should return the value computed during the first call.",
    starter: `export function once<T extends (...args: any[]) => any>(fn: T): T {
  // TODO: implement wrapper
  return fn;
}
`,
    tests: `import { once } from "./index";

describe("once", () => {
  it("only invokes the target function once", () => {
    let count = 0;
    const add = once((x: number) => {
      count++;
      return x + 5;
    });
    expect(add(1)).toBe(6);
    expect(add(10)).toBe(6);
    expect(count).toBe(1);
  });
});
`,
  },
  {
    slug: "fe-clamp",
    title: "Clamp",
    difficulty: "easy",
    topics: ["math"],
    estimatedMinutes: 10,
    description:
      "Implement `clamp(val, min, max)` that restricts `val` to the range `[min, max]` (inclusive).",
    starter: `export function clamp(val: number, min: number, max: number): number {
  // TODO: implement
  return val;
}
`,
    tests: `import { clamp } from "./index";

describe("clamp", () => {
  it("keeps values inside bounds unchanged", () => {
    expect(clamp(5, 1, 10)).toBe(5);
  });
  it("clamps values below the min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps values above the max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
`,
  },
  {
    slug: "fe-get",
    title: "Object Get Path",
    difficulty: "medium",
    topics: ["objects"],
    estimatedMinutes: 20,
    description:
      "Implement `get(obj, path, defaultValue)` mirroring Lodash's `_.get`. Extract values from deep paths (arrays or objects). Path can be dot-separated or an array.\n\n```ts\nget({ a: [{ b: 2 }] }, 'a.0.b') // => 2\n```",
    starter: `export function get(obj: any, path: string | string[], defaultValue?: any): any {
  // TODO: implement
  return undefined;
}
`,
    tests: `import { get } from "./index";

describe("get", () => {
  const o = { a: [{ b: { c: 3 } }] };
  it("resolves nested keys", () => {
    expect(get(o, "a.0.b.c")).toBe(3);
  });
  it("resolves path arrays", () => {
    expect(get(o, ["a", "0", "b", "c"])).toBe(3);
  });
  it("returns default for unresolved paths", () => {
    expect(get(o, "x.y", "default")).toBe("default");
  });
});
`,
  },
  {
    slug: "fe-set",
    title: "Object Set Path",
    difficulty: "medium",
    topics: ["objects"],
    estimatedMinutes: 25,
    description:
      "Implement `set(obj, path, value)` mirroring Lodash's `_.set`. Set the value at a deep path, creating intermediate objects or arrays if necessary.",
    starter: `export function set(obj: any, path: string | string[], value: any): any {
  // TODO: implement
  return obj;
}
`,
    tests: `import { set } from "./index";

describe("set", () => {
  it("sets values on simple paths", () => {
    const o: any = {};
    set(o, "a.b", 2);
    expect(o.a.b).toBe(2);
  });
  it("creates arrays for numeric indices", () => {
    const o: any = {};
    set(o, "a.0.b", 99);
    expect(Array.isArray(o.a)).toBe(true);
    expect(o.a[0].b).toBe(99);
  });
});
`,
  },
  {
    slug: "fe-pick",
    title: "Pick Keys",
    difficulty: "easy",
    topics: ["objects"],
    estimatedMinutes: 15,
    description:
      "Implement `pick(obj, keys)` returning a new object containing only properties listed in `keys`.\n\n```ts\npick({ a: 1, b: 2, c: 3 }, ['a', 'c']) // => { a: 1, c: 3 }\n```",
    starter: `export function pick(obj: any, keys: string[]): any {
  // TODO: implement
  return {};
}
`,
    tests: `import { pick } from "./index";

describe("pick", () => {
  it("extracts requested keys", () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });
  it("ignores missing keys", () => {
    expect(pick({ a: 1 }, ["a", "x"])).toEqual({ a: 1 });
  });
});
`,
  },
  {
    slug: "fe-omit",
    title: "Omit Keys",
    difficulty: "easy",
    topics: ["objects"],
    estimatedMinutes: 15,
    description:
      "Implement `omit(obj, keys)` returning a new object containing all properties of `obj` except those listed in `keys`.",
    starter: `export function omit(obj: any, keys: string[]): any {
  // TODO: implement
  return {};
}
`,
    tests: `import { omit } from "./index";

describe("omit", () => {
  it("removes specified keys", () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ["b"])).toEqual({ a: 1, c: 3 });
  });
});
`,
  },
  {
    slug: "fe-cycle",
    title: "Cycle Loop",
    difficulty: "easy",
    topics: ["generators", "functions"],
    estimatedMinutes: 15,
    description:
      "Implement `cycle(...args)` that returns a helper function. Each time that helper function is called, it returns the next item in `args` in a round-robin cycle.\n\n```ts\nconst next = cycle('a', 'b');\nnext() // => 'a'\nnext() // => 'b'\nnext() // => 'a'\n```",
    starter: `export function cycle(...args: any[]): () => any {
  // TODO: implement
  return () => undefined;
}
`,
    tests: `import { cycle } from "./index";

describe("cycle", () => {
  it("cycles round robin", () => {
    const next = cycle(1, 2, 3);
    expect(next()).toBe(1);
    expect(next()).toBe(2);
    expect(next()).toBe(3);
    expect(next()).toBe(1);
  });
});
`,
  },
  {
    slug: "fe-difference",
    title: "Array Difference",
    difficulty: "easy",
    topics: ["arrays"],
    estimatedMinutes: 10,
    description:
      "Implement `difference(arr, filter)` returning values in `arr` that are not present in `filter`.",
    starter: `export function difference<T>(arr: T[], filter: T[]): T[] {
  // TODO: implement
  return [];
}
`,
    tests: `import { difference } from "./index";

describe("difference", () => {
  it("returns unique difference", () => {
    expect(difference([1, 2, 3], [2, 4])).toEqual([1, 3]);
  });
});
`,
  },
  {
    slug: "fe-intersection",
    title: "Array Intersection",
    difficulty: "easy",
    topics: ["arrays"],
    estimatedMinutes: 10,
    description:
      "Implement `intersection(a, b)` returning an array of unique values present in both `a` and `b`.",
    starter: `export function intersection<T>(a: T[], b: T[]): T[] {
  // TODO: implement
  return [];
}
`,
    tests: `import { intersection } from "./index";

describe("intersection", () => {
  it("finds mutual elements", () => {
    expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  });
});
`,
  },
  {
    slug: "fe-union",
    title: "Array Union",
    difficulty: "easy",
    topics: ["arrays"],
    estimatedMinutes: 10,
    description:
      "Implement `union(...arrays)` returning a single array containing all unique elements across all input arrays in order.",
    starter: `export function union<T>(...arrays: T[][]): T[] {
  // TODO: implement
  return [];
}
`,
    tests: `import { union } from "./index";

describe("union", () => {
  it("combines unique elements in order", () => {
    expect(union([1, 2], [2, 3], [1, 4])).toEqual([1, 2, 3, 4]);
  });
});
`,
  },
  {
    slug: "fe-camelcase",
    title: "CamelCase String",
    difficulty: "medium",
    topics: ["strings"],
    estimatedMinutes: 15,
    description:
      "Implement `camelCase(str)` that converts space-, dash-, or underscore-separated words into standard camelCase.\n\n```ts\ncamelCase('hello_world') // => 'helloWorld'\n```",
    starter: `export function camelCase(str: string): string {
  // TODO: implement
  return "";
}
`,
    tests: `import { camelCase } from "./index";

describe("camelCase", () => {
  it("converts basic separated text", () => {
    expect(camelCase("hello_world")).toBe("helloWorld");
    expect(camelCase("Foo-Bar")).toBe("fooBar");
    expect(camelCase("hello world")).toBe("helloWorld");
  });
});
`,
  },
  {
    slug: "fe-compact",
    title: "Compact Array",
    difficulty: "easy",
    topics: ["arrays"],
    estimatedMinutes: 10,
    description:
      "Implement `compact(arr)` that filters out falsy values (`false`, `null`, `0`, `\"\"`, `undefined`, `NaN`).",
    starter: `export function compact<T>(arr: T[]): T[] {
  // TODO: implement
  return [];
}
`,
    tests: `import { compact } from "./index";

describe("compact", () => {
  it("removes all falsy values", () => {
    expect(compact([0, 1, false, 2, "", 3, null, undefined, NaN])).toEqual([1, 2, 3]);
  });
});
`,
  },
  {
    slug: "fe-is-equal-primitive",
    title: "Is Equal Primitive",
    difficulty: "easy",
    topics: ["math"],
    estimatedMinutes: 10,
    description:
      "Implement a function `is(x, y)` behaving exactly like `Object.is`. Pay special attention to negative zero `-0` vs `+0` and `NaN` comparisons.",
    starter: `export function is(x: any, y: any): boolean {
  // TODO: implement without Object.is
  return false;
}
`,
    tests: `import { is } from "./index";

describe("is", () => {
  it("compares NaN correctly", () => {
    expect(is(NaN, NaN)).toBe(true);
  });
  it("distinguishes +0 and -0", () => {
    expect(is(+0, -0)).toBe(false);
  });
  it("identifies matching numbers", () => {
    expect(is(5, 5)).toBe(true);
  });
});
`,
  },
  {
    slug: "fe-promise-timeout",
    title: "Promise Timeout wrap",
    difficulty: "medium",
    topics: ["async", "promises"],
    estimatedMinutes: 20,
    description:
      "Implement `promiseTimeout(promise, ms)` returning a promise that rejects with `\"Timeout\"` if the input promise fails to settle within `ms` milliseconds.",
    starter: `export function promiseTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  // TODO: implement
  return promise;
}
`,
    tests: `import { promiseTimeout } from "./index";

describe("promiseTimeout", () => {
  it("resolves when the promise finishes first", async () => {
    const p = new Promise(r => setTimeout(() => r(1), 10));
    expect(await promiseTimeout(p, 40)).toBe(1);
  });
  it("rejects when the timer expires first", async () => {
    const p = new Promise(r => setTimeout(() => r(1), 50));
    await expect(promiseTimeout(p, 10)).rejects.toThrow("Timeout");
  });
});
`,
  },
  {
    slug: "fe-size",
    title: "Size of Structure",
    difficulty: "easy",
    topics: ["objects", "arrays"],
    estimatedMinutes: 10,
    description:
      "Implement `size(val)` returning the length of string/array/Map/Set, or the number of keys on a plain object. Return `0` otherwise.",
    starter: `export function size(val: any): number {
  // TODO: implement
  return 0;
}
`,
    tests: `import { size } from "./index";

describe("size", () => {
  it("calculates for array", () => {
    expect(size([1, 2])).toBe(2);
  });
  it("calculates for object", () => {
    expect(size({ a: 1, b: 2 })).toBe(2);
  });
  it("calculates for string", () => {
    expect(size("hello")).toBe(5);
  });
});
`,
  },
  {
    slug: "fe-negative-index",
    title: "Negative Array Slicing",
    difficulty: "medium",
    topics: ["arrays", "proxies"],
    estimatedMinutes: 20,
    description:
      "Implement `negativeIndex(arr)` wrapping an array using Proxies so negative indexing works (e.g. `arr[-1]` returns the last element).",
    starter: `export function negativeIndex<T>(arr: T[]): T[] {
  // TODO: wrap using Proxy
  return arr;
}
`,
    tests: `import { negativeIndex } from "./index";

describe("negativeIndex", () => {
  it("supports negative offsets", () => {
    const wrapped = negativeIndex([10, 20, 30]);
    expect(wrapped[-1]).toBe(30);
    expect(wrapped[-2]).toBe(20);
    expect(wrapped[0]).toBe(10);
  });
});
`,
  },
  {
    slug: "fe-rgb-to-hex",
    title: "RGB to Hex Converter",
    difficulty: "easy",
    topics: ["strings"],
    estimatedMinutes: 10,
    description:
      "Implement `rgbToHex(r, g, b)` returning a standard `#RRGGBB` hex string.",
    starter: `export function rgbToHex(r: number, g: number, b: number): string {
  // TODO: implement
  return "";
}
`,
    tests: `import { rgbToHex } from "./index";

describe("rgbToHex", () => {
  it("converts simple bounds", () => {
    expect(rgbToHex(255, 255, 255)).toBe("#ffffff");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });
});
`,
  },
  {
    slug: "fe-hex-to-rgb",
    title: "Hex to RGB Converter",
    difficulty: "easy",
    topics: ["strings"],
    estimatedMinutes: 10,
    description:
      "Implement `hexToRgb(hex)` returning `{ r, g, b }` object representation for `#RRGGBB` or `#RGB` hex inputs.",
    starter: `export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // TODO: implement
  return null;
}
`,
    tests: `import { hexToRgb } from "./index";

describe("hexToRgb", () => {
  it("converts hex code", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
  });
});
`,
  },
  {
    slug: "fe-text-truncate",
    title: "Text Truncate",
    difficulty: "easy",
    topics: ["strings"],
    estimatedMinutes: 10,
    description:
      "Implement `truncate(str, limit)` that shortens `str` to `limit` characters and appends `...` if it exceeds the limit. Do not cut if it is within limits.",
    starter: `export function truncate(str: string, limit: number): string {
  // TODO: implement
  return str;
}
`,
    tests: `import { truncate } from "./index";

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });
  it("keeps short strings", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
});
`,
  },
  {
    slug: "fe-query-stringify",
    title: "Query String stringify",
    difficulty: "medium",
    topics: ["strings", "objects"],
    estimatedMinutes: 15,
    description:
      "Implement `stringifyQuery(obj)` converting a flat key-value object to a URL search query string (omitting leading `?`).\n\n```ts\nstringifyQuery({ a: 1, b: 'c d' }) // => 'a=1&b=c%20d'\n```",
    starter: `export function stringifyQuery(obj: Record<string, any>): string {
  // TODO: implement
  return "";
}
`,
    tests: `import { stringifyQuery } from "./index";

describe("stringifyQuery", () => {
  it("formats key values", () => {
    expect(stringifyQuery({ a: 1, b: "c" })).toBe("a=1&b=c");
  });
  it("encodes uri entities", () => {
    expect(stringifyQuery({ q: "hello world" })).toBe("q=hello%20world");
  });
});
`,
  },
  {
    slug: "fe-query-parse",
    title: "Query String parse",
    difficulty: "medium",
    topics: ["strings", "objects"],
    estimatedMinutes: 15,
    description:
      "Implement `parseQuery(str)` converting a URL search query string to key-value pairs.",
    starter: `export function parseQuery(str: string): Record<string, string> {
  // TODO: implement
  return {};
}
`,
    tests: `import { parseQuery } from "./index";

describe("parseQuery", () => {
  it("parses segments", () => {
    expect(parseQuery("a=1&b=c")).toEqual({ a: "1", b: "c" });
  });
  it("handles empty/special", () => {
    expect(parseQuery("?q=hello%20world")).toEqual({ q: "hello world" });
  });
});
`,
  },
  {
    slug: "fe-promise-reject",
    title: "Promise.reject mimic",
    difficulty: "easy",
    topics: ["async", "promises"],
    estimatedMinutes: 10,
    description:
      "Implement a wrapper `rejectPromise(reason)` that returns a rejected Promise carrying the given reason.",
    starter: `export function rejectPromise(reason: any): Promise<never> {
  // TODO: implement
  return Promise.resolve(null as never);
}
`,
    tests: `import { rejectPromise } from "./index";

describe("rejectPromise", () => {
  it("returns rejected promise", async () => {
    await expect(rejectPromise("error")).rejects.toBe("error");
  });
});
`,
  },
  {
    slug: "fe-json-parse",
    title: "Simplified JSON Parser",
    difficulty: "hard",
    topics: ["serialization", "recursion"],
    estimatedMinutes: 35,
    description:
      "Implement `jsonParse(str)` returning the parsed JSON value. You can assume correct syntax, and only need to support numbers, booleans, strings, arrays, and objects.",
    starter: `export function jsonParse(str: string): any {
  // TODO: parse (simplified)
  return JSON.parse(str);
}
`,
    tests: `import { jsonParse } from "./index";

describe("jsonParse", () => {
  it("parses numbers and booleans", () => {
    expect(jsonParse("42")).toBe(42);
    expect(jsonParse("true")).toBe(true);
  });
  it("parses objects and arrays", () => {
    expect(jsonParse('{"a":[1,true]}')).toEqual({ a: [1, true] });
  });
});
`,
  },
];

async function main() {
  const prisma = new PrismaClient();
  let created = 0;
  for (const u of UTILS) {
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
  console.log(`\nSeeded ${created} additional frontend utility challenges.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
