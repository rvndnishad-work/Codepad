/** Interviewer-only changes to how people talk, through the interview PATCH. */

async function patchInterview(id: string, body: object, fallback: string): Promise<void> {
  const r = await fetch(`/api/interview/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as { error?: unknown };
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : fallback);
}

/** Saves (or clears, with an empty string) the meeting link. */
export function saveMeetingLink(id: string, url: string): Promise<void> {
  return patchInterview(id, { meetingUrl: url.trim() || null }, "Could not save the link.");
}

/** Built-in video (true) or the meeting link (false) for this interview. */
export function saveBuiltinVideo(id: string, on: boolean): Promise<void> {
  return patchInterview(id, { builtinVideo: on }, "Could not change how you talk.");
}

/** Record the built-in call (before the interview starts only). */
export function saveRecordVideo(id: string, on: boolean): Promise<void> {
  return patchInterview(id, { recordVideo: on }, "Could not change recording.");
}
