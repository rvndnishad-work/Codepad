export type NavQuestion = { slug: string; title: string; difficulty: string };

export type TrackPosition = { index: number; total: number };

export type SuggestionItem = { title: string; slug: string; difficulty: string };

/** One section of the study flow, as the section bar lists it. */
export type StudySection = { id: string; label: string };

/** Offset for anything that scrolls under the site nav and the section bar. */
export const STICKY_OFFSET = 164;
