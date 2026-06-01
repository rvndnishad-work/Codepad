import { parseType, type Contract, type ContractType } from "../types";
import type { LanguageHarness } from "./index";

const RUST_SCALAR: Record<string, string> = {
  int: "i64",
  long: "i64",
  double: "f64",
  bool: "bool",
  string: "String",
};

function rustType(t: ContractType): string {
  const { base, dims } = parseType(t);
  let ty = RUST_SCALAR[base];
  for (let d = 0; d < dims; d++) ty = `Vec<${ty}>`;
  return ty;
}

function rustDefault(t: ContractType): string {
  const { base, dims } = parseType(t);
  if (dims > 0) return "vec![]";
  return base === "bool" ? "false" : base === "string" ? "String::new()" : base === "double" ? "0.0" : "0";
}

/**
 * Rust harness — self-contained full file. No serde on single-file Piston, so
 * the harness embeds a minimal JSON parser plus a `FromJv` trait (JSON -> typed)
 * and a `ToJson` trait (typed -> JSON), both blanket-implemented for Vec<T> so
 * only per-parameter extraction is code-generated.
 */
export const rust: LanguageHarness = {
  selfContained: true,

  genStub(c: Contract): string {
    const params = c.params.map((p) => `${p.name}: ${rustType(p.type)}`).join(", ");
    const isVoid = c.returnType === "void";
    const retType = c.returnType as ContractType;
    const ret = isVoid ? "" : ` -> ${rustType(retType)}`;
    const body = isVoid ? "    // TODO: implement\n" : `    // TODO: implement\n    return ${rustDefault(retType)};\n`;

    const extract = c.params
      .map((p, i) => `        let ${p.name}: ${rustType(p.type)} = FromJv::from_jv(&__args[${i}]);`)
      .join("\n");
    const argNames = c.params.map((p) => p.name).join(", ");
    const callPrint = isVoid
      ? `        ${c.functionName}(${argNames});\n        println!("null");`
      : `        println!("{}", ${c.functionName}(${argNames}).to_json());`;

    return `#![allow(non_snake_case, unused)]
use std::io::Read;

// ===== Your solution: implement ${c.functionName} =====
fn ${c.functionName}(${params})${ret} {
${body}}

// ===== Judge harness — do not edit below this line =====
#[derive(Clone)]
enum Jv { Null, Num(f64), Bool(bool), Str(String), Arr(Vec<Jv>) }

struct JP { b: Vec<char>, i: usize }
impl JP {
  fn new(s: &str) -> JP { JP { b: s.chars().collect(), i: 0 } }
  fn ws(&mut self) { while self.i < self.b.len() && self.b[self.i].is_whitespace() { self.i += 1; } }
  fn val(&mut self) -> Jv {
    self.ws();
    let c = self.b[self.i];
    if c == '[' { self.arr() }
    else if c == '"' { self.strv() }
    else if c == 't' || c == 'f' { self.boolv() }
    else if c == 'n' { self.i += 4; Jv::Null }
    else { self.num() }
  }
  fn arr(&mut self) -> Jv {
    let mut v = vec![]; self.i += 1; self.ws();
    if self.b[self.i] == ']' { self.i += 1; return Jv::Arr(v); }
    loop { v.push(self.val()); self.ws(); if self.b[self.i] == ',' { self.i += 1; } else { self.i += 1; break; } }
    Jv::Arr(v)
  }
  fn strv(&mut self) -> Jv {
    self.i += 1; let mut s = String::new();
    while self.b[self.i] != '"' {
      if self.b[self.i] == '\\\\' {
        self.i += 1; let e = self.b[self.i]; self.i += 1;
        match e { 'n'=>s.push('\\n'), 't'=>s.push('\\t'), 'r'=>s.push('\\r'), '"'=>s.push('"'), '\\\\'=>s.push('\\\\'), '/'=>s.push('/'), _=>s.push(e) }
      } else { s.push(self.b[self.i]); self.i += 1; }
    }
    self.i += 1; Jv::Str(s)
  }
  fn boolv(&mut self) -> Jv { if self.b[self.i] == 't' { self.i += 4; Jv::Bool(true) } else { self.i += 5; Jv::Bool(false) } }
  fn num(&mut self) -> Jv {
    let st = self.i;
    while self.i < self.b.len() { let c = self.b[self.i]; if c.is_ascii_digit() || c=='-' || c=='+' || c=='.' || c=='e' || c=='E' { self.i += 1; } else { break; } }
    let s: String = self.b[st..self.i].iter().collect();
    Jv::Num(s.parse().unwrap_or(0.0))
  }
}

trait FromJv { fn from_jv(j: &Jv) -> Self; }
impl FromJv for i64 { fn from_jv(j: &Jv) -> Self { if let Jv::Num(n) = j { n.round() as i64 } else { 0 } } }
impl FromJv for f64 { fn from_jv(j: &Jv) -> Self { if let Jv::Num(n) = j { *n } else { 0.0 } } }
impl FromJv for bool { fn from_jv(j: &Jv) -> Self { if let Jv::Bool(b) = j { *b } else { false } } }
impl FromJv for String { fn from_jv(j: &Jv) -> Self { if let Jv::Str(s) = j { s.clone() } else { String::new() } } }
impl<T: FromJv> FromJv for Vec<T> { fn from_jv(j: &Jv) -> Self { if let Jv::Arr(a) = j { a.iter().map(|e| T::from_jv(e)).collect() } else { vec![] } } }

trait ToJson { fn to_json(&self) -> String; }
impl ToJson for i64 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for f64 { fn to_json(&self) -> String { format!("{}", self) } }
impl ToJson for bool { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for String { fn to_json(&self) -> String { let mut r = String::from("\\""); for ch in self.chars() { match ch { '"'=>r.push_str("\\\\\\""), '\\\\'=>r.push_str("\\\\\\\\"), '\\n'=>r.push_str("\\\\n"), _=>r.push(ch) } } r.push('"'); r } }
impl<T: ToJson> ToJson for Vec<T> { fn to_json(&self) -> String { let parts: Vec<String> = self.iter().map(|e| e.to_json()).collect(); format!("[{}]", parts.join(",")) } }

fn main() {
  let mut __input = String::new();
  std::io::stdin().read_to_string(&mut __input).unwrap();
  let mut __p = JP::new(&__input);
  if let Jv::Arr(__cases) = __p.val() {
    for __c in __cases.iter() {
      if let Jv::Arr(__args) = __c {
${extract}
${callPrint}
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
