import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { staffCan } from "@/lib/permissions/staff";
import { executeBatch } from "@/lib/judge/run";
import { genStub, hasHarness } from "@/lib/judge/harness";
import { isValidType, compareValues, type Contract, type CompareMode } from "@/lib/judge/types";
import { PistonUnavailableError } from "@/lib/piston";

// Admin-only. Given a function contract, enabled languages, reference solutions,
// and test inputs, this:
//   1. runs the canonical reference to GENERATE the expected output per case,
//   2. runs every other language's reference and confirms identical output
//      (catches stub/harness/contract bugs before candidates ever see them),
//   3. returns generated starter stubs per language.
// The form persists the returned expectedJson + stubs into the step.

const MAX_CASES = 100;

const schema = z.object({
  functionName: z.string().min(1).max(80).regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  signature: z.object({
    params: z.array(z.object({ name: z.string().min(1).max(40), type: z.string().max(40) })).max(10),
    returnType: z.string().max(40),
  }),
  languages: z.array(z.string()).min(1).max(8),
  referenceSolutions: z.record(z.string(), z.string().max(64 * 1024)),
  tests: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().max(200),
        argsJson: z.string().max(20_000),
        isHidden: z.boolean().optional(),
        weight: z.number().optional(),
        compare: z.enum(["exact", "float", "unordered"]).optional(),
      })
    )
    .min(1)
    .max(MAX_CASES),
});

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!(await staffCan(session, "content:curate"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const { functionName, signature, languages, referenceSolutions, tests } = parsed.data;

  // ── Validate the contract types ──
  for (const p of signature.params) {
    if (!isValidType(p.type)) return NextResponse.json({ error: `Invalid param type "${p.type}"` }, { status: 400 });
  }
  if (signature.returnType !== "void" && !isValidType(signature.returnType)) {
    return NextResponse.json({ error: `Invalid return type "${signature.returnType}"` }, { status: 400 });
  }
  for (const lang of languages) {
    if (!hasHarness(lang)) return NextResponse.json({ error: `Unsupported language "${lang}"` }, { status: 400 });
  }

  const contract: Contract = {
    functionName,
    params: signature.params as Contract["params"],
    returnType: signature.returnType as Contract["returnType"],
  };

  // ── Parse + validate test argument tuples ──
  const argsList: unknown[][] = [];
  for (const t of tests) {
    let args: unknown;
    try {
      args = JSON.parse(t.argsJson);
    } catch {
      return NextResponse.json({ error: `Test "${t.name}": arguments are not valid JSON.` }, { status: 400 });
    }
    if (!Array.isArray(args) || args.length !== signature.params.length) {
      return NextResponse.json(
        { error: `Test "${t.name}": expected an array of ${signature.params.length} argument(s).` },
        { status: 400 }
      );
    }
    argsList.push(args as unknown[]);
  }

  // ── Pick a canonical reference (first enabled language with a solution) ──
  const canonicalLang = languages.find((l) => (referenceSolutions[l] ?? "").trim().length > 0);
  if (!canonicalLang) {
    return NextResponse.json(
      { error: "Provide a reference solution in at least one enabled language to generate expected outputs." },
      { status: 400 }
    );
  }

  try {
    // 1) Generate expected outputs from the canonical reference.
    const canonical = await executeBatch(canonicalLang, referenceSolutions[canonicalLang], contract, argsList);
    if (canonical.compileError) {
      return NextResponse.json(
        { error: `Reference (${canonicalLang}) failed to compile.`, stderr: canonical.stderr, canonicalLang },
        { status: 422 }
      );
    }
    const expected: { id: string; expectedJson: string }[] = [];
    const refErrors: { id: string; name: string; error: string }[] = [];
    canonical.outputs.forEach((o, i) => {
      if (o.error || o.raw == null) refErrors.push({ id: tests[i].id, name: tests[i].name, error: o.error ?? "no output" });
      else expected.push({ id: tests[i].id, expectedJson: o.raw });
    });
    if (refErrors.length) {
      return NextResponse.json(
        { error: `Reference (${canonicalLang}) errored on ${refErrors.length} case(s).`, canonicalLang, refErrors },
        { status: 422 }
      );
    }

    const expectedById = new Map(expected.map((e) => [e.id, e.expectedJson]));

    // 2) Cross-check every other enabled language's reference (if provided).
    const agreement: Record<string, { ok: boolean; compileError?: boolean; stderr?: string; mismatches: { id: string; name: string; got: string | null; expected: string }[] }> = {};
    for (const lang of languages) {
      if (lang === canonicalLang) {
        agreement[lang] = { ok: true, mismatches: [] };
        continue;
      }
      const ref = (referenceSolutions[lang] ?? "").trim();
      if (!ref) continue; // optional — not all languages need an author reference
      const out = await executeBatch(lang, referenceSolutions[lang], contract, argsList);
      if (out.compileError) {
        agreement[lang] = { ok: false, compileError: true, stderr: out.stderr, mismatches: [] };
        continue;
      }
      const mismatches: { id: string; name: string; got: string | null; expected: string }[] = [];
      out.outputs.forEach((o, i) => {
        const exp = expectedById.get(tests[i].id)!;
        const mode = (tests[i].compare ?? "exact") as CompareMode;
        let ok = false;
        if (!o.error && "value" in o) {
          try {
            ok = compareValues(JSON.parse(exp), o.value, contract.returnType, mode);
          } catch {
            ok = false;
          }
        }
        if (!ok) mismatches.push({ id: tests[i].id, name: tests[i].name, got: o.raw, expected: exp });
      });
      agreement[lang] = { ok: mismatches.length === 0, mismatches };
    }

    // 3) Generate starter stubs for every enabled language.
    const stubs: Record<string, string> = {};
    for (const lang of languages) stubs[lang] = genStub(lang, contract);

    const allAgree = Object.values(agreement).every((a) => a.ok);
    return NextResponse.json({ ok: allAgree, canonicalLang, expected, stubs, agreement });
  } catch (err) {
    if (err instanceof PistonUnavailableError) {
      return NextResponse.json({ error: "Code execution is temporarily unavailable. Try again shortly." }, { status: 503 });
    }
    console.error("Validate error:", err);
    return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  }
}
