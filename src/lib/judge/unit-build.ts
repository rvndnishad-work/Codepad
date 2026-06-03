/**
 * Pure (dependency-free) program assembly for the unit-js server runner. Kept
 * separate from unit-js.ts so it can be unit-tested without pulling in the
 * Piston client. See unit-js.ts for the full rationale.
 */

export const RESULTS_MARK = "__UNIT_RESULTS__";

/** Remove ESM import/export syntax so all files share one scope after concat. */
export function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import\s+[^;\n]*;?\s*$/gm, "") // import ... ;  (single line)
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "") // export { a, b };
    .replace(/\bexport\s+default\s+/g, "")
    .replace(/\bexport\s+/g, "");
}

// Minimal Jest-compatible shim (valid TS, loose typing). Collects registered
// tests, runs them (awaiting async), and prints one JSON line of results.
const UNIT_SHIM = String.raw`
type __Test = { name: string; fn: () => any };
const __tests: __Test[] = [];
let __prefix = "";
function describe(name: string, fn: () => void) {
  const prev = __prefix;
  __prefix = prev ? prev + " > " + name : name;
  try { fn(); } finally { __prefix = prev; }
}
function test(name: string, fn: () => any) { __tests.push({ name: __prefix ? __prefix + " > " + name : name, fn }); }
const it = test;
function beforeEach(_fn: () => any) { /* not supported; ignored */ }
function afterEach(_fn: () => any) {}

function __isAny(x: any): boolean { return x && typeof x === "object" && x.__anyCtor !== undefined; }
function __matchAny(marker: any, val: any): boolean {
  const c = marker.__anyCtor;
  if (c === String) return typeof val === "string";
  if (c === Number) return typeof val === "number";
  if (c === Boolean) return typeof val === "boolean";
  if (c === Object) return val !== null && typeof val === "object";
  if (c === Array) return Array.isArray(val);
  try { return val instanceof c; } catch { return false; }
}
function __deepEqual(a: any, b: any): boolean {
  if (__isAny(a)) return __matchAny(a, b);
  if (__isAny(b)) return __matchAny(b, a);
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) { if (!__deepEqual(a[k], b[k])) return false; }
  return true;
}
function __show(x: any): string { try { return JSON.stringify(x); } catch { return String(x); } }
function __fail(msg: string): never { throw new Error(msg); }

function __matchers(actual: any, neg: boolean) {
  const ok = (cond: boolean, msg: string) => { if (neg ? cond : !cond) __fail(msg); };
  return {
    toBe: (e: any) => ok(Object.is(actual, e), "expected " + __show(actual) + (neg ? " not " : " ") + "to be " + __show(e)),
    toEqual: (e: any) => ok(__deepEqual(actual, e), "expected " + __show(actual) + (neg ? " not " : " ") + "to equal " + __show(e)),
    toStrictEqual: (e: any) => ok(__deepEqual(actual, e), "expected " + __show(actual) + " to strictly equal " + __show(e)),
    toContain: (e: any) => ok(Array.isArray(actual) ? actual.indexOf(e) >= 0 : String(actual).indexOf(e) >= 0, "expected " + __show(actual) + " to contain " + __show(e)),
    toBeCloseTo: (e: number, p: number = 2) => ok(Math.abs(actual - e) < Math.pow(10, -p) / 2, "expected " + actual + " to be close to " + e),
    toBeTruthy: () => ok(!!actual, "expected " + __show(actual) + " to be truthy"),
    toBeFalsy: () => ok(!actual, "expected " + __show(actual) + " to be falsy"),
    toBeNull: () => ok(actual === null, "expected " + __show(actual) + " to be null"),
    toBeUndefined: () => ok(actual === undefined, "expected value to be undefined"),
    toBeDefined: () => ok(actual !== undefined, "expected value to be defined"),
    toBeGreaterThan: (e: number) => ok(actual > e, "expected " + actual + " > " + e),
    toBeGreaterThanOrEqual: (e: number) => ok(actual >= e, "expected " + actual + " >= " + e),
    toBeLessThan: (e: number) => ok(actual < e, "expected " + actual + " < " + e),
    toBeLessThanOrEqual: (e: number) => ok(actual <= e, "expected " + actual + " <= " + e),
    toBeInstanceOf: (c: any) => ok(actual instanceof c, "expected value to be instance of " + (c && c.name)),
    toHaveLength: (n: number) => ok(actual && actual.length === n, "expected length " + n + " got " + (actual && actual.length)),
    toThrow: (m?: any) => {
      let threw = false, err: any;
      try { typeof actual === "function" ? actual() : void 0; } catch (e) { threw = true; err = e; }
      let cond = threw;
      if (threw && m !== undefined) cond = String(err && err.message).indexOf(String(m)) >= 0;
      ok(cond, "expected function to throw" + (m !== undefined ? " " + String(m) : ""));
    },
  };
}
const expect: any = function (actual: any): any {
  const base: any = __matchers(actual, false);
  base.not = __matchers(actual, true);
  base.resolves = {
    toEqual: async (e: any) => { const v = await actual; return __matchers(v, false).toEqual(e); },
    toBe: async (e: any) => { const v = await actual; return __matchers(v, false).toBe(e); },
  };
  base.rejects = {
    toThrow: async (m?: any) => { try { await actual; __fail("expected promise to reject"); } catch (e: any) { if (m !== undefined && String(e && e.message).indexOf(String(m)) < 0) __fail("rejected with wrong error"); } },
    toBeInstanceOf: async (c: any) => { try { await actual; __fail("expected promise to reject"); } catch (e: any) { if (!(e instanceof c)) __fail("rejected with wrong type"); } },
  };
  return base;
};
expect.any = (ctor: any) => ({ __anyCtor: ctor });
expect.stringContaining = (_s: string) => ({ __anyCtor: String });

async function __run() {
  const out: { name: string; status: string; error?: string }[] = [];
  for (const t of __tests) {
    try { await t.fn(); out.push({ name: t.name, status: "pass" }); }
    catch (e: any) { out.push({ name: t.name, status: "fail", error: String((e && e.message) || e) }); }
  }
  console.log("__RESULTS_MARK__" + JSON.stringify(out));
}
`.replace("__RESULTS_MARK__", RESULTS_MARK);

/** Assemble the single-file program: shim + candidate source + hidden tests. */
export function buildUnitProgram(sourceFiles: Record<string, string>, testFiles: Record<string, string>): string {
  const source = Object.values(sourceFiles).map(stripModuleSyntax).join("\n\n");
  const tests = Object.values(testFiles).map(stripModuleSyntax).join("\n\n");
  return `/// <reference lib="es2020" />
${UNIT_SHIM}
// ===== candidate source =====
${source}
// ===== tests =====
${tests}

void __run();
`;
}
