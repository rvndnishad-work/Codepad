/**
 * Shared `/api/execute` client.
 *
 * Every surface that runs backend code (playground, challenges, collab,
 * AI workspace, admin reruns) posts the same contract. Centralizing it keeps
 * multi-file payloads, stdin and speculative flags consistent — previously
 * each call site hand-rolled its fetch and silently dropped siblings/stdin.
 */

import {
  buildRunPayload,
  type WorkspaceFiles,
  type PistonExtraFile,
} from "./run-payload";

export type ExecuteRequestBody = {
  language: string;
  code: string;
  speculative?: boolean;
  codeHash?: string;
  files?: PistonExtraFile[];
  stdin?: string;
};

export async function postExecute(
  body: ExecuteRequestBody,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ status: number; data: any }> {
  const res = await fetch("/api/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

/**
 * Multi-file request body from a workspace file map: the active file runs
 * as the entry, visible siblings travel as Piston extra files. Empty
 * extras/stdin are omitted so single-file payloads stay byte-identical to
 * the legacy hand-rolled calls.
 */
export function executeBodyForFiles(args: {
  language: string;
  activeFilePath: string;
  files: WorkspaceFiles;
  speculative: boolean;
  codeHash?: string;
  stdin?: string;
}): ExecuteRequestBody {
  const { code, extraFiles } = buildRunPayload(args.activeFilePath, args.files);
  return {
    language: args.language,
    code,
    speculative: args.speculative,
    ...(args.codeHash !== undefined ? { codeHash: args.codeHash } : {}),
    ...(extraFiles.length > 0 ? { files: extraFiles } : {}),
    ...(args.stdin !== undefined ? { stdin: args.stdin } : {}),
  };
}
