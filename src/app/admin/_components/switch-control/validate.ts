/**
 * Input rules for changing a feature switch. Pure, shared by the server
 * action and the confirm panel (so the button state matches the server).
 * Client-safe: type imports only. The action checks the key is registered.
 */
import type { SwitchState } from "@/lib/admin/switches";

export type SetSwitchInput = {
  key: string;
  state: SwitchState;
  /** Shown where the function would be. Empty = the switch default message. */
  message?: string | null;
  /** ISO time to switch back on automatically. Ignored when turning on. */
  resumeAt?: string | null;
  /** Why. Required. */
  note: string;
};

export type ValidSwitchInput = {
  key: string;
  state: SwitchState;
  message: string | null;
  resumeAt: Date | null;
  note: string;
};

export const NOTE_MIN = 3;
export const NOTE_MAX = 500;
export const MESSAGE_MAX = 500;
const STATES: SwitchState[] = ["on", "read_only", "off"];

export function validateSwitchInput(
  input: SetSwitchInput,
  now: Date,
): { ok: true; value: ValidSwitchInput } | { ok: false; error: string } {
  if (!input || typeof input.key !== "string" || !input.key) return { ok: false, error: "Unknown switch." };
  if (!STATES.includes(input.state)) return { ok: false, error: "Pick On, Read only or Off." };
  const note = String(input.note ?? "").trim();
  if (note.length < NOTE_MIN) return { ok: false, error: "Write a short note saying why." };
  if (note.length > NOTE_MAX) return { ok: false, error: `Keep the note under ${NOTE_MAX} characters.` };

  const turningOn = input.state === "on";
  const message = turningOn ? null : String(input.message ?? "").trim() || null;
  if (message && message.length > MESSAGE_MAX) return { ok: false, error: `Keep the message under ${MESSAGE_MAX} characters.` };

  let resumeAt: Date | null = null;
  if (!turningOn && input.resumeAt) {
    const d = new Date(input.resumeAt);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "The turn-back-on time is not a valid date." };
    if (d.getTime() <= now.getTime()) return { ok: false, error: "The turn-back-on time must be in the future." };
    resumeAt = d;
  }
  return { ok: true, value: { key: input.key, state: input.state, message, resumeAt, note } };
}

export const STATE_LABELS: Record<SwitchState, string> = { on: "On", read_only: "Read only", off: "Off" };
