// Verifies the function-harness runtime contract against live Piston (:2000).
// Mirrors the Python/JS driver templates in src/lib/judge/harness/*, assembles
// candidate code + driver + input.json, runs it, and checks the per-case output.
//
//   node scripts/judge-verify.mjs
//
// This exercises the RISKY runtime part (input.json read, JSON I/O, line-per-
// case output). The pure TS comparison logic is covered by tsc + reasoning.

const BASE = process.env.PISTON_URL ?? "http://localhost:2000";

const runtimes = await (await fetch(`${BASE}/api/v2/runtimes`)).json();
const verOf = (lang) =>
  runtimes
    .filter((r) => r.language === lang)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0]?.version;

// ── Driver templates (mirror src/lib/judge/harness/{python,javascript}.ts) ──
const pyDriver = (fn) => `
import json as _json
import sys as _sys
def _judge_main():
    _cases = _json.loads(_sys.stdin.read())
    _out = []
    for _case in _cases:
        try:
            _r = ${fn}(*_case)
            _out.append(_json.dumps(_r, separators=(",", ":")))
        except Exception as _e:
            _out.append(_json.dumps({"__judge_error__": str(_e)}))
    print("\\n".join(_out))
_judge_main()
`;

const jsDriver = (fn) => `
const __cases = JSON.parse(require("fs").readFileSync(0, "utf8"));
const __out = [];
for (const __c of __cases) {
  try { __out.push(JSON.stringify(${fn}(...__c))); }
  catch (__e) { __out.push(JSON.stringify({ __judge_error__: String((__e && __e.message) || __e) })); }
}
console.log(__out.join("\\n"));
`;

const tsPrelude = `/// <reference lib="es2020" />\n`;
const tsDriver = (fn) => `
declare const require: any;
const __cases: any[] = JSON.parse(require("fs").readFileSync(0, "utf8"));
const __out: string[] = [];
for (const __c of __cases) {
  try { __out.push(JSON.stringify((${fn} as any)(...__c))); }
  catch (__e: any) { __out.push(JSON.stringify({ __judge_error__: String((__e && __e.message) || __e) })); }
}
console.log(__out.join("\\n"));
`;

// ── Contract: twoSum(nums: int[], target: int) -> int[] ──
const fn = "twoSum";
const cases = [
  { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
  { args: [[3, 2, 4], 6], expected: [1, 2] },
  { args: [[3, 3], 6], expected: [0, 1] },
];
const inputFile = JSON.stringify(cases.map((c) => c.args));

const pyRef = `def ${fn}(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []
`;
const jsRef = `function ${fn}(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
  return [];
}
`;
const tsRef = `function ${fn}(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i])!, i];
    seen.set(nums[i], i);
  }
  return [];
}
`;

async function runLang(name, pistonLang, entryFile, program) {
  const body = {
    language: pistonLang,
    version: verOf(pistonLang),
    files: [{ name: entryFile, content: program }],
    stdin: inputFile,
    run_timeout: 3000,
    compile_timeout: 10000,
  };
  const r = await (await fetch(`${BASE}/api/v2/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })).json();
  if (r.message) return console.log(`${name.padEnd(12)} ERROR: ${r.message}`);
  if (r.compile && r.compile.code !== 0) {
    return console.log(`${name.padEnd(12)} COMPILE-FAIL: ${(r.compile.stderr || "").trim().replace(/\n/g, " ").slice(0, 160)}`);
  }
  const lines = (r.run.stdout || "").replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
  let pass = 0;
  cases.forEach((c, i) => {
    let ok = false;
    try { ok = JSON.stringify(JSON.parse(lines[i] ?? "null")) === JSON.stringify(c.expected); } catch { ok = false; }
    if (ok) pass++;
  });
  if (pass !== cases.length && (r.run.stderr || !r.run.stdout)) {
    console.log(`${name.padEnd(12)} (stderr: ${(r.run.stderr || "<empty stdout>").trim().replace(/\n/g, " ").slice(0, 160)})`);
  }
  const verdict = pass === cases.length ? "OK" : "MISMATCH";
  console.log(`${name.padEnd(12)} ${verdict}  ${pass}/${cases.length}  out=[${lines.join(" | ")}]`);
}

console.log("=== function-harness runtime verification (twoSum) ===");
// Go: self-contained full file (mirrors src/lib/judge/harness/go.ts output).
const goFull = `package main

import (
	"encoding/json"
	"fmt"
	"os"
)

func twoSum(nums []int, target int) []int {
	seen := map[int]int{}
	for i, n := range nums {
		if j, ok := seen[target-n]; ok {
			return []int{j, i}
		}
		seen[n] = i
	}
	return nil
}

func main() {
	var __cases [][]json.RawMessage
	json.NewDecoder(os.Stdin).Decode(&__cases)
	for _, __c := range __cases {
		func() {
			defer func() {
				if __r := recover(); __r != nil {
					__e, _ := json.Marshal(map[string]string{"__judge_error__": fmt.Sprint(__r)})
					fmt.Println(string(__e))
				}
			}()
			var nums []int
			json.Unmarshal(__c[0], &nums)
			var target int
			json.Unmarshal(__c[1], &target)
			__res, _ := json.Marshal(twoSum(nums, target))
			fmt.Println(string(__res))
		}()
	}
}
`;

await runLang("python", "python", "main.py", pyRef + pyDriver(fn));
await runLang("javascript", "javascript", "main.js", jsRef + jsDriver(fn));
await runLang("typescript", "typescript", "main.ts", tsPrelude + tsRef + tsDriver(fn));
await runLang("go", "go", "main.go", goFull);

// Negative check: a wrong solution should NOT pass all cases.
const jsWrong = `function ${fn}(nums, target){ return [0,0]; }`;
await runLang("js(wrong)", "javascript", "main.js", jsWrong + jsDriver(fn));
