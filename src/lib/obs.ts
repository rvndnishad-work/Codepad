// Execution observability: single-line JSON events for runs, cache hits,
// and executor outages. Counts and outcomes only, never code/stdin/file
// contents. Logging never throws, even if console.info itself fails.

export type RunOutcome = "ok" | "compile-error" | "signal" | "runtime-error";

export function logEvent(
  name: string,
  fields: Record<string, string | number | boolean | null | undefined>,
): void {
  try {
    const clean: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) clean[key] = value;
    }
    console.info(JSON.stringify({ event: name, ts: new Date().toISOString(), ...clean }));
  } catch {
    // Observability must never break a run.
  }
}

// Classify a Piston result: compile failures first, then signal kills,
// then non-zero exits.
export function runOutcome(result: {
  compileError?: boolean;
  signal?: string | null;
  exitCode?: number;
}): RunOutcome {
  if (result.compileError) return "compile-error";
  if (result.signal) return "signal";
  if (result.exitCode !== 0) return "runtime-error";
  return "ok";
}
