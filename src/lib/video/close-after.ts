/**
 * Closes an interview's built-in call once the response has gone out, so
 * ending an interview never waits on LiveKit. Outside a request (scripts,
 * cron helpers) it just runs. Server only.
 */
import { after } from "next/server";
import { closeVideoRoom } from "./livekit-server";

export function closeVideoRoomAfter(sessionId: string): void {
  try {
    after(() => closeVideoRoom(sessionId));
  } catch {
    void closeVideoRoom(sessionId);
  }
}
