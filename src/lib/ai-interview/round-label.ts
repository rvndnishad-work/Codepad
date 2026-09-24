/**
 * Plain label for a round's stack ("React", "Python + Django", "Go"). Pure,
 * so client components can use it.
 */
import { BACKEND_LANGUAGES, DSA_LANGUAGE_LABELS } from "@/lib/interview/stack";

const PARADIGM_NAMES: Record<string, string> = { frontend: "Frontend", backend: "Backend", dsa: "Algorithms", conversation: "Conversation" };

export function paradigmName(paradigm: string | null | undefined): string {
  return PARADIGM_NAMES[paradigm ?? ""] ?? "Coding";
}

export function roundLabel(r: { paradigm: string | null | undefined; language?: string | null; frameworkLabel?: string | null }): string {
  if (r.paradigm === "backend") {
    const lang = BACKEND_LANGUAGES.find((b) => b.id === r.language)?.label ?? r.language ?? "Backend";
    return r.frameworkLabel ? `${lang} + ${r.frameworkLabel}` : lang;
  }
  if (r.paradigm === "conversation") return r.frameworkLabel ?? "Conversation";
  if (r.paradigm === "dsa") return DSA_LANGUAGE_LABELS[r.language ?? ""] ?? r.language ?? "Algorithms";
  return r.frameworkLabel ?? "Frontend";
}
