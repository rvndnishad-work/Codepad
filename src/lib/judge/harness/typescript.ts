import { parseType, type Contract, type ContractType } from "../types";
import type { LanguageHarness } from "./index";

/** Map a contract type to a TypeScript type for the stub signature. */
function tsType(t: ContractType): string {
  const { base, dims } = parseType(t);
  const scalar = base === "bool" ? "boolean" : base === "string" ? "string" : "number";
  return scalar + "[]".repeat(dims);
}

/**
 * TypeScript harness. Like JavaScript, but the stub is typed and the driver
 * declares `require` so Piston's `tsc` compile is clean without @types/node.
 */
export const typescript: LanguageHarness = {
  // Piston's tsc defaults to an old lib target (no Map/Set/Promise). Pull in a
  // modern lib so candidate solutions using ES2020 builtins compile.
  genPrelude(): string {
    return `/// <reference lib="es2020" />\n`;
  },

  genStub(c: Contract): string {
    const params = c.params.map((p) => `${p.name}: ${tsType(p.type)}`).join(", ");
    const ret = c.returnType === "void" ? "void" : tsType(c.returnType);
    return `function ${c.functionName}(${params}): ${ret} {
  // TODO: implement
${c.returnType === "void" ? "" : "  return undefined as any;\n"}}
`;
  },

  genDriver(c: Contract): string {
    return `
declare const require: any;
// Console capture: candidate prints are buffered and flushed AFTER the case
// result lines (tagged __JLOG__), so stray prints can neither shift case
// alignment nor vanish — the client renders them in a Console tab.
const __jlogOrig: (...a: any[]) => void = console.log.bind(console);
const __jlogs: string[] = [];
const __jfmt = (x: any): string => {
  if (typeof x === "string") return x;
  try {
    const s = JSON.stringify(x);
    return s === undefined ? String(x) : s;
  } catch {
    return String(x);
  }
};
for (const __m of ["log", "info", "warn", "error", "debug"])
  (console as any)[__m] = (...__a: any[]) => { __jlogs.push("[" + __m + "] " + __a.map(__jfmt).join(" ")); };
const __cases: any[] = JSON.parse(require("fs").readFileSync(0, "utf8"));
const __out: string[] = [];
for (const __c of __cases) {
  try {
    __out.push(JSON.stringify((${c.functionName} as any)(...__c)));
  } catch (__e: any) {
    __out.push(JSON.stringify({ __judge_error__: String((__e && __e.message) || __e) }));
  }
}
__jlogOrig(__out.join("\\n"));
for (const __l of __jlogs) __jlogOrig("__JLOG__" + JSON.stringify(__l));
`;
  },
};
