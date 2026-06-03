import { prisma } from "@/lib/prisma";
import type { AuthedKey } from "./auth";

export type AuditEntry = {
  auth: AuthedKey;
  kind: "tool" | "resource";
  name: string;
  args?: unknown;
  resultSummary?: string | null;
  errorCode?: string | null;
  durationMs: number;
};

/**
 * Truncate args to keep the audit row reasonable in size. Tool args are
 * usually small but a future write tool (e.g. `add_candidate_note(body)`)
 * could be huge — guard against that growing the table without bound.
 */
const MAX_ARGS_JSON_CHARS = 2000;
const MAX_SUMMARY_CHARS = 500;

export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  let argsJson: string | null = null;
  if (entry.args !== undefined) {
    try {
      const raw = JSON.stringify(entry.args);
      argsJson = raw.length > MAX_ARGS_JSON_CHARS
        ? raw.slice(0, MAX_ARGS_JSON_CHARS) + "…(truncated)"
        : raw;
    } catch {
      argsJson = "(unserializable args)";
    }
  }

  let summary = entry.resultSummary ?? null;
  if (summary && summary.length > MAX_SUMMARY_CHARS) {
    summary = summary.slice(0, MAX_SUMMARY_CHARS) + "…";
  }

  await prisma.mcpAuditLog.create({
    data: {
      workspaceId: entry.auth.workspaceId,
      apiKeyId: entry.auth.apiKeyId,
      kind: entry.kind,
      name: entry.name,
      argsJson,
      resultSummary: summary,
      errorCode: entry.errorCode ?? null,
      durationMs: entry.durationMs,
    },
  });
}

/**
 * Wrap an async tool/resource handler so every invocation is timed and
 * audited automatically. Errors are re-thrown after being logged.
 */
export async function withAudit<T>(
  meta: Omit<AuditEntry, "durationMs" | "resultSummary" | "errorCode">,
  handler: () => Promise<{ result: T; summary?: string }>
): Promise<T> {
  const startedAt = Date.now();
  try {
    const { result, summary } = await handler();
    void writeAuditEntry({
      ...meta,
      durationMs: Date.now() - startedAt,
      resultSummary: summary ?? null,
    }).catch(() => {});
    return result;
  } catch (err) {
    void writeAuditEntry({
      ...meta,
      durationMs: Date.now() - startedAt,
      errorCode: err instanceof Error ? err.name : "Error",
      resultSummary: err instanceof Error ? err.message : String(err),
    }).catch(() => {});
    throw err;
  }
}
