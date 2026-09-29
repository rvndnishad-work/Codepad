/**
 * Languages the AI interviewer can speak in theory rounds. The workspace
 * picks a default in Settings > Screening defaults; each theory round keeps
 * its own (stored in its theory settings), so changing the default never
 * changes a screening already sent.
 *
 * Pure, so the settings page, the composer, the candidate screen and the
 * follow-up prompt share it.
 */

export const INTERVIEWER_LANGUAGES = [
  { id: "en", label: "English", speech: "en-US" },
  { id: "es", label: "Spanish", speech: "es-ES" },
  { id: "fr", label: "French", speech: "fr-FR" },
  { id: "de", label: "German", speech: "de-DE" },
  { id: "pt", label: "Portuguese", speech: "pt-BR" },
  { id: "it", label: "Italian", speech: "it-IT" },
  { id: "nl", label: "Dutch", speech: "nl-NL" },
  { id: "hi", label: "Hindi", speech: "hi-IN" },
  { id: "ja", label: "Japanese", speech: "ja-JP" },
] as const;

export type InterviewerLanguage = (typeof INTERVIEWER_LANGUAGES)[number]["id"];

export const DEFAULT_INTERVIEWER_LANGUAGE: InterviewerLanguage = "en";

export function isInterviewerLanguage(v: unknown): v is InterviewerLanguage {
  return typeof v === "string" && INTERVIEWER_LANGUAGES.some((l) => l.id === v);
}

/** A supported language id, or English. */
export function interviewerLanguageOf(v: unknown): InterviewerLanguage {
  return isInterviewerLanguage(v) ? v : DEFAULT_INTERVIEWER_LANGUAGE;
}

/** "Spanish". */
export function interviewerLanguageLabel(v: unknown): string {
  const id = interviewerLanguageOf(v);
  return INTERVIEWER_LANGUAGES.find((l) => l.id === id)!.label;
}

/** Tag for the browser's speech recognition and voices, such as "es-ES". */
export function speechLangOf(v: unknown): string {
  const id = interviewerLanguageOf(v);
  return INTERVIEWER_LANGUAGES.find((l) => l.id === id)!.speech;
}
