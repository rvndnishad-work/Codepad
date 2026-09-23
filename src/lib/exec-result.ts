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
  /** Output was truncated to the server cap. */
  truncated?: boolean;
  /** Present on error responses (4xx/5xx). */
  error?: string;
};

export type ExecLine = {
  method: "log" | "error" | "info";
  text: string;
  /** Which program stream the text came from; absent for our own notices. */
  stream?: "stdout" | "stderr";
};

/**
 * Turn an HTTP status + parsed body into ordered console lines. `data` may be
 * null when the body wasn't JSON. A truncation notice is appended whenever
 * the server capped the output, so consoles never silently cut.
 */
export function describeExecution(status: number, data: ExecResponse | null): ExecLine[] {
  const lines = describeInner(status, data);
  if (data?.truncated) {
    lines.push({ method: "info", text: "Output truncated at 256KB." });
  }
  return lines;
}

/**
 * Short run provenance for console footers, e.g. "3.12.0 · 42ms" or
 * "3.12.0 · cached". Null when the response carries nothing to show.
 */
export function formatRunMeta(data: {
  version?: string;
  timeMs?: number;
  cacheHit?: boolean;
} | null): string | null {
  if (!data || !data.version) return null;
  if (data.cacheHit) return `${data.version} · cached`;
  if (typeof data.timeMs === "number") return `${data.version} · ${data.timeMs}ms`;
  return data.version;
}

function describeInner(status: number, data: ExecResponse | null): ExecLine[] {
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
    if (data.stderr) lines.push({ method: "error", text: data.stderr, stream: "stderr" });
    return lines;
  }

  // ── Killed by a signal: time or memory limit (defence-in-depth) ─────────
  if (data.signal) {
    const lines: ExecLine[] = [];
    if (data.stdout) lines.push({ method: "log", text: data.stdout, stream: "stdout" });
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
      data.stdout
        ? { method: "log", text: data.stdout, stream: "stdout" }
        : { method: "log", text: "Code executed successfully with zero output." },
    ];
    // stderr on a clean exit is usually warnings — surface it but don't fail.
    if (data.stderr) lines.push({ method: "error", text: data.stderr, stream: "stderr" });
    return lines;
  }

  const lines: ExecLine[] = [];
  if (data.stdout) lines.push({ method: "log", text: data.stdout, stream: "stdout" });
  lines.push(
    data.stderr
      ? { method: "error", text: data.stderr, stream: "stderr" }
      : { method: "error", text: `Process exited with code ${data.exitCode ?? 1}.` },
  );
  return lines;
}

export type RunSummary = { tone: "ok" | "error"; text: string };

/**
 * One-line outcome for console footers ("Exited with code 0", "Compilation
 * failed", "Runner unavailable"). Replaces a fixed "Execution complete."
 * that also showed under failures.
 */
export function summarizeRun(status: number, data: ExecResponse | null): RunSummary {
  if (status === 429) return { tone: "error", text: "Rate limited" };
  if (status === 503) return { tone: "error", text: "Runner unavailable" };
  if (status === 413) return { tone: "error", text: "Too large to run" };
  if (!data || status >= 400) return { tone: "error", text: "Could not run" };
  if (data.compileError) return { tone: "error", text: "Compilation failed" };
  if (data.signal) {
    return {
      tone: "error",
      text: data.signal === "SIGKILL" ? "Stopped at the time or memory limit" : `Stopped by ${data.signal}`,
    };
  }
  const code = data.exitCode ?? 0;
  return { tone: code === 0 ? "ok" : "error", text: `Exited with code ${code}` };
}
