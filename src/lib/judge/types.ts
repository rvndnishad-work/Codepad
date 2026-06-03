/**
 * Language-neutral type grammar + value comparison for the function-harness
 * judge. Kept deliberately small (v1): scalars and 1D/2D arrays of scalars.
 * Structured types (linked lists, trees, graphs) are out of scope for now.
 *
 * Contract flow:
 *   - Author declares a Contract (functionName, typed params, returnType).
 *   - Per language we generate a stub (candidate fills in) and a driver that
 *     reads `input.json` (a JSON array of argument-tuples), calls the function
 *     for each case, and prints the JSON of each return value, one line/case.
 *   - The judge parses those lines and compares them to the expected JSON with
 *     compareValues(), which understands float tolerance and unordered arrays.
 */

export const SCALAR_TYPES = ["int", "long", "double", "bool", "string"] as const;
export type ScalarType = (typeof SCALAR_TYPES)[number];

/** A concrete parameter/return type, e.g. "int", "string[]", "double[][]". */
export type ContractType =
  | ScalarType
  | `${ScalarType}[]`
  | `${ScalarType}[][]`;

export type ReturnType = ContractType | "void";

export type ContractParam = { name: string; type: ContractType };

export type Contract = {
  functionName: string;
  params: ContractParam[];
  returnType: ReturnType;
};

/** How a test case's expected value is matched against the produced value. */
export type CompareMode = "exact" | "float" | "unordered";

export type ParsedType = { base: ScalarType; dims: 0 | 1 | 2 };

const DEFAULT_FLOAT_TOL = 1e-6;

/** Parse a ContractType string into its scalar base and array dimensionality. */
export function parseType(t: ContractType): ParsedType {
  let dims = 0;
  let base = t;
  while (base.endsWith("[]")) {
    dims++;
    base = base.slice(0, -2) as ContractType;
  }
  if (!SCALAR_TYPES.includes(base as ScalarType)) {
    throw new Error(`Unknown scalar type "${base}" in "${t}"`);
  }
  if (dims > 2) throw new Error(`Arrays deeper than 2D are unsupported: "${t}"`);
  return { base: base as ScalarType, dims: dims as 0 | 1 | 2 };
}

export function isValidType(t: string): t is ContractType {
  try {
    parseType(t as ContractType);
    return true;
  } catch {
    return false;
  }
}

/** All selectable types for the authoring UI (scalars + 1D + 2D). */
export function allTypes(): ContractType[] {
  const out: ContractType[] = [];
  for (const s of SCALAR_TYPES) {
    out.push(s, `${s}[]`, `${s}[][]`);
  }
  return out;
}

/**
 * Build the `input.json` payload the driver reads: a JSON array of cases, each
 * case an array of argument values in declared param order. Arguments are
 * already plain JS values (parsed from the author's argsJson).
 */
export function buildInputFile(cases: unknown[][]): string {
  return JSON.stringify(cases);
}

/** Split a driver's stdout into one trimmed line per case (drops trailing blank). */
export function splitDriverOutput(stdout: string): string[] {
  return stdout.replace(/\r\n/g, "\n").replace(/\n+$/, "").split("\n");
}

/**
 * Compare an expected value (as produced by the reference/author) against a
 * produced value (parsed from a driver output line). Both are plain JS values.
 */
export function compareValues(
  expected: unknown,
  got: unknown,
  type: ReturnType,
  mode: CompareMode = "exact",
  floatTol: number = DEFAULT_FLOAT_TOL
): boolean {
  if (type === "void") return true;
  const { base, dims } = parseType(type);
  return cmp(expected, got, base, dims, mode, floatTol);
}

function cmp(
  a: unknown,
  b: unknown,
  base: ScalarType,
  dims: number,
  mode: CompareMode,
  tol: number
): boolean {
  if (dims === 0) return cmpScalar(a, b, base, mode, tol);

  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  // Unordered comparison only applies at the top level of a 1D array.
  if (mode === "unordered" && dims === 1) {
    const sa = [...a].map((x) => canonicalScalarKey(x, base));
    const sb = [...b].map((x) => canonicalScalarKey(x, base));
    sa.sort();
    sb.sort();
    return sa.every((v, i) => v === sb[i]);
  }

  for (let i = 0; i < a.length; i++) {
    if (!cmp(a[i], b[i], base, dims - 1, mode, tol)) return false;
  }
  return true;
}

function cmpScalar(a: unknown, b: unknown, base: ScalarType, mode: CompareMode, tol: number): boolean {
  switch (base) {
    case "double": {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isNaN(na) || Number.isNaN(nb)) return false;
      // Doubles always tolerate small error; "exact" still uses tolerance to
      // absorb cross-language float formatting differences.
      return Math.abs(na - nb) <= tol;
    }
    case "int":
    case "long":
      return BigInt(Math.trunc(Number(a))) === BigInt(Math.trunc(Number(b)));
    case "bool":
      return Boolean(a) === Boolean(b);
    case "string":
      return String(a) === String(b);
  }
}

function canonicalScalarKey(x: unknown, base: ScalarType): string {
  switch (base) {
    case "double":
      return Number(x).toFixed(6);
    case "int":
    case "long":
      return String(Math.trunc(Number(x)));
    case "bool":
      return Boolean(x) ? "1" : "0";
    case "string":
      return JSON.stringify(String(x));
  }
}
