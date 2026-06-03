import { parseType, type Contract, type ContractType } from "../types";
import type { LanguageHarness } from "./index";

const CPP_SCALAR: Record<string, string> = {
  int: "int",
  long: "long long",
  double: "double",
  bool: "bool",
  string: "string",
};

function cppType(t: ContractType): string {
  const { base, dims } = parseType(t);
  let ty = CPP_SCALAR[base];
  for (let d = 0; d < dims; d++) ty = `vector<${ty}>`;
  return ty;
}

function cppDefault(t: ContractType): string {
  const { base, dims } = parseType(t);
  if (dims > 0) return "{}";
  return base === "bool" ? "false" : base === "string" ? '""' : "0";
}

/**
 * C++ harness — self-contained full file. No JSON library is available on
 * single-file Piston, so the harness embeds a minimal JSON parser plus generic
 * `conv` (JSON value -> typed) and `ser` (typed -> JSON string) helpers that
 * recurse via templates, so only per-parameter extraction is code-generated.
 */
export const cpp: LanguageHarness = {
  selfContained: true,

  genStub(c: Contract): string {
    const params = c.params.map((p) => `${cppType(p.type)} ${p.name}`).join(", ");
    const isVoid = c.returnType === "void";
    const retType = c.returnType as ContractType;
    const ret = isVoid ? "void" : cppType(retType);
    const body = isVoid ? "    // TODO: implement\n" : `    // TODO: implement\n    return ${cppDefault(retType)};\n`;

    const extract = c.params
      .map((p, i) => `      ${cppType(p.type)} ${p.name}; conv(__c.arr[${i}], ${p.name});`)
      .join("\n");
    const argNames = c.params.map((p) => p.name).join(", ");
    const callPrint = isVoid
      ? `      ${c.functionName}(${argNames}); cout << "null\\n";`
      : `      cout << ser(${c.functionName}(${argNames})) << "\\n";`;

    return `#include <bits/stdc++.h>
using namespace std;

// ===== Your solution: implement ${c.functionName} =====
${ret} ${c.functionName}(${params}) {
${body}}

// ===== Judge harness — do not edit below this line =====
struct JV { int t=0; double num=0; bool b=false; string str; vector<JV> arr; };
struct JP {
  const string& s; size_t i=0;
  JP(const string& s_):s(s_){}
  void ws(){ while(i<s.size() && isspace((unsigned char)s[i])) i++; }
  JV val(){ ws(); char c=s[i];
    if(c=='[') return arrv(); if(c=='"') return strv();
    if(c=='t'||c=='f') return boolv(); if(c=='n'){ i+=4; return JV(); } return numv(); }
  JV arrv(){ JV j; j.t=4; i++; ws(); if(s[i]==']'){ i++; return j; }
    while(true){ j.arr.push_back(val()); ws(); if(s[i]==','){ i++; continue; } i++; break; } return j; }
  JV strv(){ JV j; j.t=3; i++; string r; while(s[i]!='"'){ if(s[i]=='\\\\'){ i++; char e=s[i++];
        switch(e){ case 'n':r+='\\n';break; case 't':r+='\\t';break; case 'r':r+='\\r';break;
          case 'b':r+='\\b';break; case 'f':r+='\\f';break; case '"':r+='"';break;
          case '\\\\':r+='\\\\';break; case '/':r+='/';break;
          case 'u':{ int cp=stoi(s.substr(i,4),0,16); i+=4; r+=(char)cp; break; } default:r+=e; } }
      else r+=s[i++]; } i++; j.str=r; return j; }
  JV boolv(){ JV j; j.t=2; if(s[i]=='t'){ j.b=true; i+=4; } else { j.b=false; i+=5; } return j; }
  JV numv(){ size_t st=i; while(i<s.size() && (isdigit((unsigned char)s[i])||s[i]=='-'||s[i]=='+'||s[i]=='.'||s[i]=='e'||s[i]=='E')) i++; JV j; j.t=1; j.num=stod(s.substr(st,i-st)); return j; }
};
static void conv(const JV& j, int& o){ o=(int)llround(j.num); }
static void conv(const JV& j, long long& o){ o=(long long)llround(j.num); }
static void conv(const JV& j, double& o){ o=j.num; }
static void conv(const JV& j, bool& o){ o=j.b; }
static void conv(const JV& j, string& o){ o=j.str; }
template<class T> static void conv(const JV& j, vector<T>& o){ o.clear(); for(auto& e: j.arr){ T t; conv(e,t); o.push_back(t); } }
static string ser(long long x){ return to_string(x); }
static string ser(int x){ return to_string(x); }
static string ser(bool x){ return x?"true":"false"; }
static string ser(double x){ ostringstream o; o<<setprecision(12)<<x; return o.str(); }
static string ser(const string& s){ string r="\\""; for(char c: s){ if(c=='"'||c=='\\\\'){ r+='\\\\'; r+=c; } else if(c=='\\n') r+="\\\\n"; else r+=c; } r+="\\""; return r; }
template<class T> static string ser(const vector<T>& v){ string r="["; for(size_t k=0;k<v.size();k++){ if(k) r+=","; r+=ser(v[k]); } r+="]"; return r; }

int main(){
  string __in((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
  JP __p(__in); JV __cases=__p.val();
  for(auto& __c: __cases.arr){
    try {
${extract}
${callPrint}
    } catch(...) { cout << "{\\"__judge_error__\\":\\"runtime exception\\"}\\n"; }
  }
  return 0;
}
`;
  },

  genDriver(): string {
    return "";
  },
};
