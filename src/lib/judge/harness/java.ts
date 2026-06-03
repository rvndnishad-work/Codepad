import { parseType, type Contract, type ContractType, type ScalarType } from "../types";
import type { LanguageHarness } from "./index";

const JAVA_SCALAR: Record<string, string> = {
  int: "int",
  long: "long",
  double: "double",
  bool: "boolean",
  string: "String",
};

function javaType(t: ContractType): string {
  const { base, dims } = parseType(t);
  return JAVA_SCALAR[base] + "[]".repeat(dims);
}

function javaDefault(t: ContractType): string {
  const { base, dims } = parseType(t);
  if (dims > 0) return `new ${JAVA_SCALAR[base]}${"[]".repeat(dims)}{}`;
  return base === "bool" ? "false" : base === "string" ? '""' : "0";
}

/** Java expression converting an Object (parsed JSON value) to a scalar. */
function scalarExpr(base: ScalarType, expr: string): string {
  switch (base) {
    case "int":
      return `((Number)(${expr})).intValue()`;
    case "long":
      return `((Number)(${expr})).longValue()`;
    case "double":
      return `((Number)(${expr})).doubleValue()`;
    case "bool":
      return `((Boolean)(${expr})).booleanValue()`;
    case "string":
      return `((String)(${expr}))`;
  }
}

/** Emit Java statements that declare `varName` of the param's type from `src`. */
function javaExtract(varName: string, type: ContractType, src: string, idx: number): string {
  const { base, dims } = parseType(type);
  const sj = JAVA_SCALAR[base];
  if (dims === 0) {
    return `        ${sj} ${varName} = ${scalarExpr(base, src)};`;
  }
  if (dims === 1) {
    return `        java.util.List<Object> __l${idx} = (java.util.List<Object>)(${src});
        ${sj}[] ${varName} = new ${sj}[__l${idx}.size()];
        for (int __k${idx} = 0; __k${idx} < __l${idx}.size(); __k${idx}++) ${varName}[__k${idx}] = ${scalarExpr(base, `__l${idx}.get(__k${idx})`)};`;
  }
  // dims === 2
  return `        java.util.List<Object> __l${idx} = (java.util.List<Object>)(${src});
        ${sj}[][] ${varName} = new ${sj}[__l${idx}.size()][];
        for (int __k${idx} = 0; __k${idx} < __l${idx}.size(); __k${idx}++) {
          java.util.List<Object> __m${idx} = (java.util.List<Object>)(__l${idx}.get(__k${idx}));
          ${sj}[] __row${idx} = new ${sj}[__m${idx}.size()];
          for (int __j${idx} = 0; __j${idx} < __m${idx}.size(); __j${idx}++) __row${idx}[__j${idx}] = ${scalarExpr(base, `__m${idx}.get(__j${idx})`)};
          ${varName}[__k${idx}] = __row${idx};
        }`;
}

/**
 * Java harness — self-contained full file (public class Main). No JSON library
 * on single-file Piston, so the harness embeds a minimal parser producing an
 * Object tree (Double/Boolean/String/List/null), a reflection-based serializer
 * that handles any primitive array, and generated per-parameter extraction.
 */
export const java: LanguageHarness = {
  selfContained: true,

  genStub(c: Contract): string {
    const params = c.params.map((p) => `${javaType(p.type)} ${p.name}`).join(", ");
    const isVoid = c.returnType === "void";
    const retType = c.returnType as ContractType;
    const ret = isVoid ? "void" : javaType(retType);
    const body = isVoid ? "        // TODO: implement\n" : `        // TODO: implement\n        return ${javaDefault(retType)};\n`;

    const extract = c.params.map((p, i) => javaExtract(p.name, p.type, `__args.get(${i})`, i)).join("\n");
    const argNames = c.params.map((p) => p.name).join(", ");
    const callPrint = isVoid
      ? `        ${c.functionName}(${argNames}); System.out.println("null");`
      : `        System.out.println(ser(${c.functionName}(${argNames})));`;

    return `import java.util.*;

public class Main {
  // ===== Your solution: implement ${c.functionName} =====
  static ${ret} ${c.functionName}(${params}) {
${body}  }

  // ===== Judge harness — do not edit below this line =====
  static String IN; static int P;
  static void ws() { while (P < IN.length() && Character.isWhitespace(IN.charAt(P))) P++; }
  static Object parse() {
    ws(); char c = IN.charAt(P);
    if (c == '[') return arr();
    if (c == '"') return str();
    if (c == 't' || c == 'f') return bool();
    if (c == 'n') { P += 4; return null; }
    return num();
  }
  static List<Object> arr() {
    List<Object> l = new ArrayList<>(); P++; ws();
    if (IN.charAt(P) == ']') { P++; return l; }
    while (true) { l.add(parse()); ws(); if (IN.charAt(P) == ',') { P++; } else { P++; break; } }
    return l;
  }
  static String str() {
    P++; StringBuilder b = new StringBuilder();
    while (IN.charAt(P) != '"') {
      char ch = IN.charAt(P++);
      if (ch == '\\\\') {
        char e = IN.charAt(P++);
        switch (e) { case 'n': b.append('\\n'); break; case 't': b.append('\\t'); break; case 'r': b.append('\\r'); break;
          case '"': b.append('"'); break; case '\\\\': b.append('\\\\'); break; case '/': b.append('/'); break; default: b.append(e); }
      } else b.append(ch);
    }
    P++; return b.toString();
  }
  static Boolean bool() { if (IN.charAt(P) == 't') { P += 4; return Boolean.TRUE; } P += 5; return Boolean.FALSE; }
  static Double num() {
    int st = P;
    while (P < IN.length()) { char c = IN.charAt(P); if (Character.isDigit(c) || c=='-' || c=='+' || c=='.' || c=='e' || c=='E') P++; else break; }
    return Double.parseDouble(IN.substring(st, P));
  }
  static String esc(String s) {
    StringBuilder b = new StringBuilder();
    for (int k = 0; k < s.length(); k++) { char ch = s.charAt(k);
      if (ch == '"' || ch == '\\\\') { b.append('\\\\'); b.append(ch); } else if (ch == '\\n') { b.append("\\\\n"); } else b.append(ch); }
    return b.toString();
  }
  static String ser(Object o) {
    if (o == null) return "null";
    if (o instanceof Boolean) return o.toString();
    if (o instanceof String) return "\\"" + esc((String) o) + "\\"";
    if (o instanceof Double || o instanceof Float) { double d = ((Number) o).doubleValue();
      if (d == Math.floor(d) && !Double.isInfinite(d)) return String.valueOf((long) d); return o.toString(); }
    if (o instanceof Number) return o.toString();
    if (o.getClass().isArray()) {
      int n = java.lang.reflect.Array.getLength(o); StringBuilder b = new StringBuilder("[");
      for (int k = 0; k < n; k++) { if (k > 0) b.append(","); b.append(ser(java.lang.reflect.Array.get(o, k))); }
      b.append("]"); return b.toString();
    }
    return "null";
  }
  @SuppressWarnings("unchecked")
  public static void main(String[] __a) throws Exception {
    IN = new String(System.in.readAllBytes()); P = 0;
    List<Object> __cases = (List<Object>) parse();
    for (Object __co : __cases) {
      List<Object> __args = (List<Object>) __co;
      try {
${extract}
${callPrint}
      } catch (Throwable __t) {
        System.out.println("{\\"__judge_error__\\":\\"" + esc(String.valueOf(__t)) + "\\"}");
      }
    }
  }
}
`;
  },

  genDriver(): string {
    return "";
  },
};
