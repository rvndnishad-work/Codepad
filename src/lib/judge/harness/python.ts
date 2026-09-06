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
import builtins as _builtins

# Console capture: candidate prints are buffered and flushed AFTER the case
# result lines (tagged __JLOG__), so stray prints can neither shift case
# alignment nor vanish — the client renders them in a Console tab.
_jlogs = []
_orig_print = _builtins.print

def _judge_print(*a, **k):
    _sep = k.get("sep", " ")
    _parts = []
    for _x in a:
        if isinstance(_x, str):
            _parts.append(_x)
        else:
            try:
                _parts.append(_json.dumps(_x, default=str))
            except Exception:
                _parts.append(str(_x))
    _jlogs.append(_sep.join(_parts))

_builtins.print = _judge_print

def _judge_main():
    _cases = _json.loads(_sys.stdin.read())
    _out = []
    for _case in _cases:
        try:
            _r = ${c.functionName}(*_case)
            _out.append(_json.dumps(_r, separators=(",", ":")))
        except Exception as _e:
            _out.append(_json.dumps({"__judge_error__": str(_e)}))
    _orig_print("\\n".join(_out))
    for _l in _jlogs:
        _orig_print("__JLOG__" + _json.dumps(_l))

_judge_main()
`;
  },
};
