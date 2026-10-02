import type { Tone } from "./list";

/** Kinds the interviews list filters by. */
export const INTERVIEW_TYPES = [
  { id: "workspace", label: "Live interviews" },
  { id: "take-home", label: "Take-homes" },
  { id: "practice", label: "Practice (no workspace)" },
] as const;

export function interviewTypeLabel(type: string, inWorkspace: boolean): string {
  if (type === "take-home") return "Take-home";
  if (!inWorkspace) return "Practice";
  return "Live interview";
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  active: { label: "Live", tone: "warn" },
  in_progress: { label: "In progress", tone: "warn" },
  completed: { label: "Completed", tone: "ok" },
  submitted: { label: "Submitted", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "off" },
  abandoned: { label: "Abandoned", tone: "off" },
  expired: { label: "Expired", tone: "off" },
};

export function interviewStatus(status: string): { label: string; tone: Tone } {
  return STATUS[status] ?? { label: status.replace(/_/g, " "), tone: "off" };
}

const RECORDING: Record<string, { label: string; tone: Tone }> = {
  recording: { label: "Recording", tone: "warn" },
  processing: { label: "Processing", tone: "info" },
  ready: { label: "Ready", tone: "ok" },
  failed: { label: "Failed", tone: "bad" },
  deleted: { label: "Deleted", tone: "off" },
};

export function recordingStatus(status: string): { label: string; tone: Tone } {
  return RECORDING[status] ?? { label: status, tone: "off" };
}
