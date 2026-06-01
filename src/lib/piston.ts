/**
 * Thin client for a Piston code-execution server (https://github.com/engineer-man/piston).
 *
 * Piston runs each submission inside an isolated, network-disabled jail with
 * CPU / memory / process / output limits, so untrusted code never touches the
 * app server. This module only translates our language ids into Piston's,
 * resolves the installed runtime version, and shapes the response.
 *
 * Configure with:
 *   PISTON_URL            base URL of the Piston API (default http://localhost:2000)
 *   PISTON_RUN_TIMEOUT    per-run wall-clock budget in ms (default 5000)
 *   PISTON_COMPILE_TIMEOUT compile budget in ms (default 10000)
 *   PISTON_RUN_MEMORY     run memory cap in bytes, -1 = unlimited (default 256MB)
 */

const PISTON_URL = (process.env.PISTON_URL ?? "http://localhost:2000").replace(/\/+$/, "");
const RUN_TIMEOUT = Number(process.env.PISTON_RUN_TIMEOUT ?? 3000);
const COMPILE_TIMEOUT = Number(process.env.PISTON_COMPILE_TIMEOUT ?? 10000);
const RUN_MEMORY = Number(process.env.PISTON_RUN_MEMORY ?? 256 * 1024 * 1024);

/** Our language id -> Piston language id + source file name. */
const LANGUAGE_MAP: Record<string, { piston: string; file: string }> = {
  python: { piston: "python", file: "main.py" },
  javascript: { piston: "javascript", file: "main.js" },
  node: { piston: "javascript", file: "main.js" },
  typescript: { piston: "typescript", file: "main.ts" },
  go: { piston: "go", file: "main.go" },
  // Java's public class must be named Main to match the file below.
  java: { piston: "java", file: "Main.java" },
  cpp: { piston: "c++", file: "main.cpp" },
  rust: { piston: "rust", file: "main.rs" },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP);

export function isSupportedLanguage(language: string): boolean {
  return language.toLowerCase() in LANGUAGE_MAP;
}

export type PistonResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  /** Set when the program never ran because compilation failed. */
  compileError?: boolean;
  /** Set when the run was killed by a signal (timeout / OOM / limit). */
  signal?: string | null;
};

export class PistonUnavailableError extends Error {}

type RuntimesResponse = Array<{ language: string; version: string; aliases: string[] }>;

let runtimesCache: { at: number; versions: Map<string, string> } | null = null;
const RUNTIMES_TTL = 5 * 60_000;

/**
 * Resolve (and cache) the installed version for each Piston language. Piston's
 * /execute requires an explicit version; we pick the highest one installed.
 */
async function resolveVersion(pistonLang: string): Promise<string> {
  const now = Date.now();
  if (!runtimesCache || now - runtimesCache.at > RUNTIMES_TTL) {
    let res: Response;
    try {
      res = await fetch(`${PISTON_URL}/api/v2/runtimes`, {
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      throw new PistonUnavailableError(
        `Cannot reach Piston at ${PISTON_URL}: ${(err as Error).message}`
      );
    }
    if (!res.ok) {
      throw new PistonUnavailableError(`Piston /runtimes returned ${res.status}`);
    }
    const runtimes = (await res.json()) as RuntimesResponse;
    const versions = new Map<string, string>();
    for (const rt of runtimes) {
      const key = rt.language;
      const existing = versions.get(key);
      if (!existing || compareSemver(rt.version, existing) > 0) {
        versions.set(key, rt.version);
      }
      // Index aliases too (e.g. "node" -> javascript runtime, "gcc"/"g++").
      for (const alias of rt.aliases ?? []) {
        const ex = versions.get(alias);
        if (!ex || compareSemver(rt.version, ex) > 0) versions.set(alias, rt.version);
      }
    }
    runtimesCache = { at: now, versions };
  }

  const version = runtimesCache.versions.get(pistonLang);
  if (!version) {
    throw new PistonUnavailableError(`Runtime "${pistonLang}" is not installed on the Piston server`);
  }
  return version;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Execute untrusted code on the Piston server. Throws PistonUnavailableError if
 * the server or the requested runtime is unreachable; never falls back to a
 * fake/emulated result.
 */
export async function runOnPiston(
  language: string,
  code: string,
  stdin: string,
  /**
   * Extra files placed alongside the entry file in the run directory (e.g. a
   * batch `input.json` the judge driver reads). The entry file stays first.
   */
  extraFiles?: Array<{ name: string; content: string }>
): Promise<PistonResult> {
  const mapping = LANGUAGE_MAP[language.toLowerCase()];
  if (!mapping) throw new Error(`Language ${language} not supported.`);

  const version = await resolveVersion(mapping.piston);

  const body = {
    language: mapping.piston,
    version,
    files: [{ name: mapping.file, content: code }, ...(extraFiles ?? [])],
    stdin: stdin ?? "",
    compile_timeout: COMPILE_TIMEOUT,
    run_timeout: RUN_TIMEOUT,
    run_memory_limit: RUN_MEMORY,
  };

  const startTime = Date.now();
  let res: Response;
  try {
    res = await fetch(`${PISTON_URL}/api/v2/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      // Generous client-side ceiling above compile+run budgets so a hung
      // Piston call can't pin our request forever.
      signal: AbortSignal.timeout(COMPILE_TIMEOUT + RUN_TIMEOUT + 5000),
    });
  } catch (err) {
    throw new PistonUnavailableError(
      `Piston execute failed: ${(err as Error).message}`
    );
  }

  if (!res.ok) {
    // 400 from Piston usually means bad runtime/version; surface as unavailable.
    let msg = `Piston returned ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new PistonUnavailableError(msg);
  }

  const data = (await res.json()) as {
    compile?: { stdout: string; stderr: string; code: number | null; signal: string | null };
    run: { stdout: string; stderr: string; code: number | null; signal: string | null };
  };

  const timeMs = Date.now() - startTime;

  // Compilation failure: report the compiler diagnostics, mark it clearly.
  if (data.compile && data.compile.code !== 0) {
    return {
      stdout: data.compile.stdout ?? "",
      stderr: data.compile.stderr || "Compilation failed.",
      exitCode: data.compile.code ?? 1,
      timeMs,
      compileError: true,
      signal: data.compile.signal,
    };
  }

  return {
    stdout: data.run.stdout ?? "",
    stderr: data.run.stderr ?? "",
    exitCode: data.run.code ?? (data.run.signal ? 137 : 0),
    timeMs,
    signal: data.run.signal,
  };
}
