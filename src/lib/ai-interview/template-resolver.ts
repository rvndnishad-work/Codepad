import { prisma } from "@/lib/prisma";
import {
  AI_INTERVIEW_TEMPLATES,
  getTemplateById as getBuiltinTemplateById,
  type AIInterviewTemplateDef,
} from "./scaffolds";

/**
 * Snapshot returned to the workspace UI: the union of builtin scaffolds and
 * the workspace's custom DB rows. The `custom` flag lets the UI distinguish
 * editable rows from baked-in ones.
 */
export type ResolvedTemplate = AIInterviewTemplateDef & { custom: boolean };

export async function listTemplatesForWorkspace(
  workspaceId: string
): Promise<ResolvedTemplate[]> {
  const customs = await prisma.aIInterviewTemplate.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
  });
  const customMapped: ResolvedTemplate[] = customs.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    estimatedMinutes: row.estimatedMinutes,
    starterFiles: safeParseStarterFiles(row.starterFiles),
    testsCode: row.testsCode,
    custom: true,
  }));
  const builtins: ResolvedTemplate[] = AI_INTERVIEW_TEMPLATES.map((t) => ({
    ...t,
    custom: false,
  }));
  // Customs first so workspace-authored content surfaces above defaults.
  return [...customMapped, ...builtins];
}

/**
 * Resolve a template id either from the DB (workspace-scoped) or from the
 * builtin scaffolds. DB takes precedence so a workspace can override a builtin
 * by reusing its id (though we don't currently expose that in UI).
 */
export async function resolveTemplate(
  id: string,
  workspaceId?: string
): Promise<AIInterviewTemplateDef | undefined> {
  if (workspaceId) {
    const row = await prisma.aIInterviewTemplate.findFirst({
      where: { id, workspaceId },
    });
    if (row) {
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        estimatedMinutes: row.estimatedMinutes,
        starterFiles: safeParseStarterFiles(row.starterFiles),
        testsCode: row.testsCode,
      };
    }
  }
  return getBuiltinTemplateById(id);
}

function safeParseStarterFiles(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    // fall through
  }
  return {};
}

/**
 * Validate user-submitted starter files JSON. Used by the create/update
 * action. Returns the canonical string to store or throws on malformed input.
 */
export function validateStarterFilesJson(input: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch (err) {
    throw new Error("Starter files must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Starter files must be a JSON object mapping path → code.");
  }
  for (const [path, code] of Object.entries(parsed)) {
    if (!path.startsWith("/")) {
      throw new Error(`Starter file path "${path}" must begin with "/".`);
    }
    if (typeof code !== "string") {
      throw new Error(`Starter file content for "${path}" must be a string.`);
    }
  }
  return JSON.stringify(parsed);
}
