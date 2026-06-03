/**
 * Shared client-side formatter for /api/execute responses.
 *
 * Keeps every caller (Playground, ChallengeAttempt, WorkspaceDashboard) in sync
 * with the route's contract: success/exit codes, compile failures, signal kills
 * (timeout / OOM), and transport errors (429 rate limit, 503 executor down, 413
 * too large). Each caller renders the returned lines however it likes.
 */

export type ExecResponse = {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  /** Program never ran — compilation failed. */
  compileError?: boolean;
  /** Run was killed by a signal (e.g. SIGKILL from the time/memory limit). */
  signal?: string | null;
  /** Served from the speculative cache. */
  cacheHit?: boolean;
  /** Present on error responses (4xx/5xx). */
  error?: string;
};

export type ExecLine = { method: "log" | "error"; text: string };

/**
 * Turn an HTTP status + parsed body into ordered console lines. `data` may be
 * null when the body wasn't JSON.
 */
export function describeExecution(status: number, data: ExecResponse | null): ExecLine[] {
  // ── Transport / server errors ──────────────────────────────────────────
  if (status === 429) {
    return [{ method: "error", text: data?.error ?? "Too many runs — please wait a moment and try again." }];
  }
  if (status === 503) {
    return [{ method: "error", text: data?.error ?? "Code execution is temporarily unavailable. Please try again shortly." }];
  }
  if (status === 413) {
    return [{ method: "error", text: data?.error ?? "Your code or input is too large to run." }];
  }
  if (!data || status >= 400) {
    return [{ method: "error", text: data?.error ?? `Execution failed (HTTP ${status}).` }];
  }

  // ── Compilation failure: program never ran ─────────────────────────────
  if (data.compileError) {
    const lines: ExecLine[] = [{ method: "error", text: "Compilation failed:" }];
    if (data.stderr) lines.push({ method: "error", text: data.stderr });
    return lines;
  }

  // ── Killed by a signal: time or memory limit (defence-in-depth) ─────────
  if (data.signal) {
    const lines: ExecLine[] = [];
    if (data.stdout) lines.push({ method: "log", text: data.stdout });
    lines.push({
      method: "error",
      text:
        data.signal === "SIGKILL"
          ? "Program terminated — it exceeded the time or memory limit."
          : `Program terminated by signal ${data.signal}.`,
    });
    return lines;
  }

  // ── Normal completion ──────────────────────────────────────────────────
  if (data.exitCode === 0) {
    const lines: ExecLine[] = [
      { method: "log", text: data.stdout || "Code executed successfully with zero output." },
    ];
    // stderr on a clean exit is usually warnings — surface it but don't fail.
    if (data.stderr) lines.push({ method: "error", text: data.stderr });
    return lines;
  }

  const lines: ExecLine[] = [];
  if (data.stdout) lines.push({ method: "log", text: data.stdout });
  lines.push({ method: "error", text: data.stderr || `Process exited with code ${data.exitCode ?? 1}.` });
  return lines;
}
