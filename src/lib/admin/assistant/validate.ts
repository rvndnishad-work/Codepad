/**
 * Argument validation for assistant tools. The model's arguments are
 * untrusted input: every tool call is checked against its declaration before
 * the executor sees it. Unknown keys are dropped, numbers given as strings are
 * coerced, strings are trimmed, and anything out of range is an error the
 * model gets back so it can correct itself.
 */
import type { ObjectSchema, ParamSchema } from "./types";

export type ValidationResult =
  | { ok: true; args: Record<string, unknown> }
  | { ok: false; error: string };

function checkOne(key: string, schema: ParamSchema, raw: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (schema.type) {
    case "string": {
      if (typeof raw !== "string" && typeof raw !== "number") return { ok: false, error: `${key} must be a string` };
      const value = String(raw).trim();
      if (schema.enum && !schema.enum.includes(value)) {
        return { ok: false, error: `${key} must be one of ${schema.enum.join(", ")}` };
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        return { ok: false, error: `${key} is longer than ${schema.maxLength} characters` };
      }
      if (schema.format === "date-time" && value && Number.isNaN(Date.parse(value))) {
        return { ok: false, error: `${key} must be an ISO date and time` };
      }
      return { ok: true, value };
    }
    case "integer":
    case "number": {
      const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
      if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false, error: `${key} must be a number` };
      if (schema.type === "integer" && !Number.isInteger(n)) return { ok: false, error: `${key} must be a whole number` };
      if (schema.minimum !== undefined && n < schema.minimum) return { ok: false, error: `${key} must be at least ${schema.minimum}` };
      if (schema.maximum !== undefined && n > schema.maximum) return { ok: false, error: `${key} must be at most ${schema.maximum}` };
      return { ok: true, value: n };
    }
    case "boolean": {
      if (typeof raw === "boolean") return { ok: true, value: raw };
      if (raw === "true" || raw === "false") return { ok: true, value: raw === "true" };
      return { ok: false, error: `${key} must be true or false` };
    }
  }
}

export function validateArgs(schema: ObjectSchema, raw: unknown): ValidationResult {
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const args: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    const v = input[key];
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) continue;
    const res = checkOne(key, prop, v);
    if (!res.ok) return res;
    args[key] = res.value;
  }
  for (const key of schema.required ?? []) {
    if (args[key] === undefined) return { ok: false, error: `${key} is required` };
  }
  return { ok: true, args };
}
