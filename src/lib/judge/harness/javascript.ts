import type { Contract } from "../types";
import type { LanguageHarness } from "./index";

/**
 * JavaScript (Node) harness. The stub is a plain (non-exported) function
 * declaration so it's in scope for the appended driver. The driver reads
 * input.json, splats each case into the function, and prints JSON per case.
 */
export const javascript: LanguageHarness = {
  genStub(c: Contract): string {
    const params = c.params.map((p) => p.name).join(", ");
    const typeHint = c.params.map((p) => `${p.name}: ${p.type}`).join(", ");
    return `// ${typeHint || "no params"} -> ${c.returnType}
function ${c.functionName}(${params}) {
  // TODO: implement
}
`;
  },

  genDriver(c: Contract): string {
    return `
// Console capture: candidate prints are buffered and flushed AFTER the case
// result lines (tagged __JLOG__), so stray prints can neither shift case
// alignment nor vanish — the client renders them in a Console tab.
const __jlogOrig = console.log.bind(console);
const __jlogs = [];
const __jfmt = (x) => {
  if (typeof x === "string") return x;
  try {
    const s = JSON.stringify(x);
    return s === undefined ? String(x) : s;
  } catch {
    return String(x);
  }
};
for (const __m of ["log", "info", "warn", "error", "debug"])
  console[__m] = (...__a) => { __jlogs.push("[" + __m + "] " + __a.map(__jfmt).join(" ")); };
const __cases = JSON.parse(require("fs").readFileSync(0, "utf8"));
const __out = [];
for (const __c of __cases) {
  try {
    __out.push(JSON.stringify(${c.functionName}(...__c)));
  } catch (__e) {
    __out.push(JSON.stringify({ __judge_error__: String((__e && __e.message) || __e) }));
  }
}
__jlogOrig(__out.join("\\n"));
for (const __l of __jlogs) __jlogOrig("__JLOG__" + JSON.stringify(__l));
`;
  },
};
