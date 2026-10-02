/** Reasons a member can pick when reporting something. Shared by the API, the button and the admin queue. */
export const REPORT_REASONS = [
  { id: "spam", label: "Spam or ads" },
  { id: "abuse", label: "Harassment or hate" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "malicious", label: "Malicious code" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

/** Reports one member may file per minute. */
export const REPORTS_PER_MINUTE = 5;
