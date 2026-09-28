/**
 * Camera and mic choices from the lobby check, kept in this browser so the
 * room joins the call the same way. Storage can be missing or blocked, so
 * every read and write is guarded and the defaults always work.
 */
import { MediaDeviceFailure } from "livekit-client";

export type VideoPrefs = {
  /** The person went through the check (or turned a device on), so the room may use the camera and mic without asking again. */
  checked: boolean;
  camId: string | null;
  micId: string | null;
  camOn: boolean;
  micOn: boolean;
  /** Joined with sound only: the camera stays off. */
  audioOnly: boolean;
};

const KEY = "interview-video-prefs:v1";

export const DEFAULT_PREFS: VideoPrefs = { checked: false, camId: null, micId: null, camOn: true, micOn: true, audioOnly: false };

export function loadPrefs(): VideoPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const v = JSON.parse(raw) as Partial<VideoPrefs>;
    return {
      checked: v.checked === true,
      camId: typeof v.camId === "string" ? v.camId : null,
      micId: typeof v.micId === "string" ? v.micId : null,
      camOn: v.camOn !== false,
      micOn: v.micOn !== false,
      audioOnly: v.audioOnly === true,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(patch: Partial<VideoPrefs>): VideoPrefs {
  const next = { ...loadPrefs(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/** A plain sentence for a camera or mic that could not start. */
export function mediaErrorMessage(err: unknown, what: "camera" | "mic" | "both" = "both"): string {
  const thing = what === "camera" ? "camera" : what === "mic" ? "microphone" : "camera or microphone";
  const f = MediaDeviceFailure.getFailure(err);
  if (f === MediaDeviceFailure.PermissionDenied) return `Your browser blocked the ${thing}. Allow it from the icon in the address bar, then try again.`;
  if (f === MediaDeviceFailure.NotFound) return `No ${thing} found. Plug one in and try again${what === "mic" ? "" : ", or use sound only"}.`;
  if (f === MediaDeviceFailure.DeviceInUse) return `Another app is using your ${thing}. Close it and try again.`;
  return `Your ${thing} did not start. Try again, or pick another one.`;
}
