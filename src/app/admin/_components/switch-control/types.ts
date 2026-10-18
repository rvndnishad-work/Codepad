import type { SwitchSide, SwitchState } from "@/lib/admin/switches";

export type { SwitchSide, SwitchState };

/** One switch as the client controls see it. Dates are ISO strings. */
export type SwitchView = {
  key: string;
  label: string;
  side: SwitchSide;
  appliesTo: string;
  description: string;
  alsoAffects: string[];
  defaultMessage: string;
  state: SwitchState;
  /** Current message, or the default one. */
  message: string;
  resumeAt: string | null;
  updatedAt: string | null;
  updatedNote: string | null;
  updatedByName: string | null;
};
