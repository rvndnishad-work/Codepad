/**
 * Pure helpers for the AI screening report additions: transcript times,
 * stored test results, and the "Open in Playground" hand-off. Safe to import
 * from client components.
 */

/** How long a read-only share link works. */
export const SHARE_LINK_DAYS = 7;

/* ── Transcript times ────────────────────────────────────────────────────── */

export type Stamp = { label: string; timed: boolean };

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * A label per message. Messages sent since timing was recorded carry `at`,
 * shown as time since the screening started (or since the first timed
 * message when the start is unknown). Older messages have no time, so they
 * show their place in the conversation instead.
 */
export function transcriptStamps(chat: { at?: string | null }[], startedAt: string | null): Stamp[] {
  const times = chat.map((m) => {
    const t = m.at ? Date.parse(m.at) : NaN;
    return Number.isFinite(t) ? t : null;
  });
  const firstTimed = times.find((t): t is number => t != null) ?? null;
  const startMs = startedAt ? Date.parse(startedAt) : NaN;
  const base = Number.isFinite(startMs) ? (firstTimed != null ? Math.min(startMs, firstTimed) : startMs) : firstTimed;
  return times.map((t, i) => (t != null && base != null ? { label: clock((t - base) / 1000), timed: true } : { label: `#${i + 1}`, timed: false }));
}

/* ── Stored test results ─────────────────────────────────────────────────── */

export type TestCase = { name: string; status: "pass" | "fail"; error: string | null };

export type TestRun = {
  passed: number;
  total: number;
  compileError: boolean;
  /** Runner output when nothing ran (compile error, crash). */
  stderr: string | null;
  tests: TestCase[];
  ranAt: string | null;
};

const MAX_ERROR = 600;

/** Normalises runner output (or a stored copy of it) into a TestRun. */
export function toTestRun(
  raw: { results?: { name?: unknown; status?: unknown; error?: unknown }[]; tests?: { name?: unknown; status?: unknown; error?: unknown }[]; compileError?: unknown; stderr?: unknown } | null | undefined,
  ranAt: string | null = null,
): TestRun | null {
  if (!raw || typeof raw !== "object") return null;
  const list = Array.isArray(raw.tests) ? raw.tests : Array.isArray(raw.results) ? raw.results : [];
  const tests: TestCase[] = list
    .filter((t) => t && typeof t.name === "string")
    .slice(0, 200)
    .map((t) => ({
      name: String(t.name).slice(0, 300),
      status: t.status === "pass" ? "pass" : "fail",
      error: typeof t.error === "string" && t.error ? t.error.slice(0, MAX_ERROR) : null,
    }));
  const stderr = typeof raw.stderr === "string" && raw.stderr.trim() ? raw.stderr.trim().slice(0, 2000) : null;
  return {
    passed: tests.filter((t) => t.status === "pass").length,
    total: tests.length,
    compileError: raw.compileError === true,
    stderr,
    tests,
    ranAt,
  };
}

export function parseTestRun(json: string | null | undefined, ranAt: Date | string | null = null): TestRun | null {
  if (!json) return null;
  try {
    return toTestRun(JSON.parse(json), ranAt ? new Date(ranAt).toISOString() : null);
  } catch {
    return null;
  }
}

/** What gets written to AIInterviewRound.testResultsJson. */
export function serializeTestRun(run: TestRun): string {
  return JSON.stringify({ passed: run.passed, total: run.total, compileError: run.compileError, stderr: run.stderr, tests: run.tests });
}

/* ── Open in Playground ──────────────────────────────────────────────────── */

/** Playground template per round language (backend and algorithm rounds). */
const LANG_TEMPLATE: Record<string, { id: string; entry: string; ext: string[] }> = {
  node: { id: "node", entry: "/index.js", ext: [".js", ".mjs", ".cjs"] },
  javascript: { id: "node", entry: "/index.js", ext: [".js", ".mjs", ".cjs"] },
  "ts-node": { id: "ts-node", entry: "/index.ts", ext: [".ts"] },
  typescript: { id: "ts-node", entry: "/index.ts", ext: [".ts"] },
  python: { id: "python", entry: "/index.py", ext: [".py"] },
  go: { id: "go", entry: "/main.go", ext: [".go"] },
  java: { id: "java", entry: "/Main.java", ext: [".java"] },
  cpp: { id: "cpp", entry: "/main.cpp", ext: [".cpp", ".cc"] },
  rust: { id: "rust", entry: "/main.rs", ext: [".rs"] },
};

const LOCKFILE = /(^|\/)package-lock\.json$/;

/**
 * The playground template and files for a round's final code. Frontend code
 * opens in the React (or plain JS) sandbox with every file. A server-run round
 * has one entry file per template, so the candidate's main source file is put
 * there and the rest ride along.
 */
export function playgroundTarget(round: { kind: string; language: string | null; files: Record<string, string> }): { templateId: string; files: Record<string, string> } | null {
  const files = Object.fromEntries(Object.entries(round.files).filter(([p, c]) => typeof c === "string" && !LOCKFILE.test(p)));
  if (!Object.keys(files).length || round.kind === "conversation" || round.kind === "theory") return null;
  if (round.kind === "frontend") {
    const react = Object.keys(files).some((p) => /\.(jsx|tsx)$/.test(p)) || Object.values(files).some((c) => /from\s+["']react["']/.test(c));
    return { templateId: react ? "react" : "javascript", files };
  }
  const t = LANG_TEMPLATE[(round.language ?? "node").toLowerCase()] ?? LANG_TEMPLATE.node;
  const sources = Object.keys(files)
    .filter((p) => t.ext.some((e) => p.endsWith(e)) && !/\.test\.|\.spec\./.test(p))
    .sort();
  const main = files[t.entry] != null ? t.entry : sources[0];
  if (!main) return { templateId: t.id, files };
  const out: Record<string, string> = { ...files };
  if (main !== t.entry) {
    delete out[main];
    out[t.entry] = files[main];
  }
  // The template's hidden package.json names the entry; a candidate copy would override it.
  delete out["/package.json"];
  return { templateId: t.id, files: out };
}
