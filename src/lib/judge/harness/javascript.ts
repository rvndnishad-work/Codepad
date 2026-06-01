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
const __cases = JSON.parse(require("fs").readFileSync(0, "utf8"));
const __out = [];
for (const __c of __cases) {
  try {
    __out.push(JSON.stringify(${c.functionName}(...__c)));
  } catch (__e) {
    __out.push(JSON.stringify({ __judge_error__: String((__e && __e.message) || __e) }));
  }
}
console.log(__out.join("\\n"));
`;
  },
};
