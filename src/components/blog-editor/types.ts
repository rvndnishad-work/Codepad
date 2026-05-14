export interface BlogEditorData {
  id?: string;
  title: string;
  content: string;
  excerpt: string;
  coverImage: string;
  published: boolean;
  tags: string[];
}

export interface BlogEditorSavePayload {
  title: string;
  content: string;
  excerpt: string;
  coverImage: string;
  published: boolean;
  tags: string[];
}

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

export const TAG_RE = /^[a-z0-9][a-z0-9-]{0,29}$/;
export const MAX_TAGS = 8;
