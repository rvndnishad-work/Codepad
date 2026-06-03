import { parseType, type Contract, type ContractType } from "../types";
import type { LanguageHarness } from "./index";

const GO_SCALAR: Record<string, string> = {
  int: "int",
  long: "int64",
  double: "float64",
  bool: "bool",
  string: "string",
};

function goType(t: ContractType): string {
  const { base, dims } = parseType(t);
  return "[]".repeat(dims) + GO_SCALAR[base];
}

function goZero(t: ContractType): string {
  const { base, dims } = parseType(t);
  if (dims > 0) return "nil";
  return base === "bool" ? "false" : base === "string" ? '""' : "0";
}

/**
 * Go harness — self-contained full file. Go's `encoding/json` is stdlib so no
 * hand-rolled parser is needed. The candidate edits the function (and may add
 * imports to the block); the embedded main() reads the batch from stdin, decodes
 * each arg into its declared type, calls the function, and prints JSON per case.
 */
export const go: LanguageHarness = {
  selfContained: true,

  genStub(c: Contract): string {
    const params = c.params.map((p) => `${p.name} ${goType(p.type)}`).join(", ");
    const isVoid = c.returnType === "void";
    const retType = c.returnType as ContractType; // only used when !isVoid
    const ret = isVoid ? "" : ` ${goType(retType)}`;
    const body = isVoid ? "\t// TODO: implement\n" : `\t// TODO: implement\n\treturn ${goZero(retType)}\n`;

    const decode = c.params
      .map((p, i) => `\t\t\tvar ${p.name} ${goType(p.type)}\n\t\t\tjson.Unmarshal(__c[${i}], &${p.name})`)
      .join("\n");
    const argNames = c.params.map((p) => p.name).join(", ");
    const callAndPrint = isVoid
      ? `\t\t\t${c.functionName}(${argNames})\n\t\t\tfmt.Println("null")`
      : `\t\t\t__res, _ := json.Marshal(${c.functionName}(${argNames}))\n\t\t\tfmt.Println(string(__res))`;

    return `package main

import (
	"encoding/json"
	"fmt"
	"os"
)

// ===== Your solution: implement ${c.functionName} =====
func ${c.functionName}(${params})${ret} {
${body}}

// ===== Judge harness — do not edit below this line =====
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
${decode}
${callAndPrint}
		}()
	}
}
`;
  },

  // Unused for self-contained languages.
  genDriver(): string {
    return "";
  },
};
