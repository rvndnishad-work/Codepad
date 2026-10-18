/**
 * The assistant's tool registry: declarations for the model and one entry
 * point that validates arguments and runs the executor.
 */
import { validateArgs } from "../validate";
import type { ToolContext, ToolDeclaration, ToolDef, ToolResult } from "../types";
import { READ_TOOLS } from "./read";
import { PROPOSE_TOOLS } from "./propose";

export const TOOLS: ToolDef[] = [...READ_TOOLS, ...PROPOSE_TOOLS];
const BY_NAME = new Map(TOOLS.map((t) => [t.decl.name, t]));

export function toolDeclarations(): ToolDeclaration[] {
  return TOOLS.map((t) => t.decl);
}

export function getTool(name: string): ToolDef | undefined {
  return BY_NAME.get(name);
}

export type ToolRun = ToolResult & { ok: boolean; args: Record<string, unknown> };

/** Validate and run one call. Never throws: errors go back to the model. */
export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<ToolRun> {
  const tool = BY_NAME.get(name);
  if (!tool) return { ok: false, args: {}, summary: `Unknown tool ${name}`, data: { error: `Unknown tool ${name}` } };
  const v = validateArgs(tool.decl.parameters, rawArgs);
  if (!v.ok) return { ok: false, args: {}, summary: `${name}: ${v.error}`, data: { error: v.error } };
  try {
    const res = await tool.run(v.args, ctx);
    const failed = !!(res.data && typeof res.data === "object" && "error" in (res.data as object));
    return { ...res, ok: !failed, args: v.args };
  } catch (err) {
    console.error("[assistant] tool failed", name, err);
    return { ok: false, args: v.args, summary: `${name} failed`, data: { error: "The lookup failed on the server." } };
  }
}
