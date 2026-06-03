import type { Contract } from "../types";
import type { LanguageHarness } from "./index";

/**
 * Python harness. Types are dynamic so the stub is untyped; the driver reads
 * input.json (array of arg-tuples), splats each into the candidate function,
 * and prints the JSON of each return value (one line per case).
 */
export const python: LanguageHarness = {
  genStub(c: Contract): string {
    const params = c.params.map((p) => p.name).join(", ");
    const typeHint = c.params.map((p) => `${p.name}: ${p.type}`).join(", ");
    return `def ${c.functionName}(${params}):
    """Implement this. Params: ${typeHint || "none"} -> ${c.returnType}"""
    # TODO: implement
    pass
`;
  },

  genDriver(c: Contract): string {
    return `
import json as _json
import sys as _sys

def _judge_main():
    _cases = _json.loads(_sys.stdin.read())
    _out = []
    for _case in _cases:
        try:
            _r = ${c.functionName}(*_case)
            _out.append(_json.dumps(_r, separators=(",", ":")))
        except Exception as _e:
            _out.append(_json.dumps({"__judge_error__": str(_e)}))
    print("\\n".join(_out))

_judge_main()
`;
  },
};
