/**
 * How people talk in one interview room: built-in video, the team's meeting
 * link, or nothing set up. Also who may see the add-on offer, and when the
 * video token route refuses. Pure: no database, no env. Safe to import from
 * client components.
 */

export type VideoMode = "builtin" | "link" | "none";

export type RoomVideo = {
  mode: VideoMode;
  /** False only when this interview should use built-in video but LiveKit is not set up on the server. */
  configured: boolean;
  /** The viewer manages billing and could switch the add-on on (interviewers only). */
  canOffer: boolean;
  /** The plan does not include the add-on yet, so the offer says to choose Growth. */
  offerUpgrade: boolean;
  /** The workspace has the add-on on, so hosts can pick built-in video or a link per interview. */
  addonOn: boolean;
  /** This interview is set to built-in video (the default), whatever the workspace has. */
  builtinVideo: boolean;
  /** This interview is set up to record the built-in call (the candidate is told in the lobby). */
  recordVideo: boolean;
  /** Interviewers only: the recordings bucket and LiveKit are set up, so Record can work. */
  recordingReady: boolean;
  billingHref: string;
  /** The add-on price for the offer text, e.g. "$15" (a month). Empty when there is no offer. */
  offerPrice: string;
};

/**
 * Built-in video when the workspace has the add-on on, the interview uses it
 * and LiveKit is set up; otherwise the meeting link, if there is one.
 */
export function roomVideoMode(a: { addonOn: boolean; builtinVideo: boolean; meetingUrl: string | null; liveKitReady: boolean }): { mode: VideoMode; configured: boolean } {
  const wantsBuiltin = a.addonOn && a.builtinVideo;
  if (wantsBuiltin && a.liveKitReady) return { mode: "builtin", configured: true };
  return { mode: a.meetingUrl ? "link" : "none", configured: !wantsBuiltin };
}

/**
 * Interviewers who manage billing see a quiet offer while the add-on is off:
 * on Growth, Enterprise and the trial it points at Billing; on Free it says
 * to choose Growth. Candidates never see it.
 */
export function videoOffer(a: { interviewer: boolean; canManageBilling: boolean; addonOn: boolean; planAllows: boolean; planName: string }): { canOffer: boolean; offerUpgrade: boolean } {
  const eligible = a.planAllows || a.planName === "FREE";
  const canOffer = a.interviewer && a.canManageBilling && !a.addonOn && eligible;
  return { canOffer, offerUpgrade: canOffer && !a.planAllows };
}

/** Statuses in which the call can be joined. */
export const VIDEO_JOIN_STATUSES = ["scheduled", "in_progress"] as const;

/** Why a join token is refused, in words people can read, or null when it may be issued. */
export function videoJoinRefusal(a: { addonOn: boolean; builtinVideo: boolean; status: string; liveKitReady: boolean }): string | null {
  if (!a.addonOn) return "Built-in video is not switched on for this workspace.";
  if (!a.builtinVideo) return "This interview uses a meeting link, not built-in video.";
  if (!(VIDEO_JOIN_STATUSES as readonly string[]).includes(a.status)) return "This interview has ended, so the call is closed.";
  if (!a.liveKitReady) return "Video is not set up yet. Ask your admin to finish the setup.";
  return null;
}

/** One stable LiveKit identity per person, so a second tab replaces the first. */
export function videoIdentity(v: { role: "interviewer" | "candidate"; userId: string | null; guestId: string | null }, sessionId: string): string {
  if (v.role === "candidate") return `c:${sessionId}`;
  if (v.guestId) return `g:${v.guestId}`;
  if (v.userId) return `u:${v.userId}`;
  // Legacy share-token interviewers: no account, one seat per interview.
  return `i:${sessionId}`;
}
