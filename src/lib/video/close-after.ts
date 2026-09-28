/**
 * Closes an interview's built-in call once the response has gone out, so
 * ending an interview never waits on LiveKit. Any recording still running
 * is stopped first, so its file is finished and saved before the room goes.
 * Outside a request (scripts, cron helpers) it just runs. Server only.
 */
import { after } from "next/server";
import { closeVideoRoom } from "./livekit-server";
import { stopRoomRecordings } from "@/lib/recording/live-server";

async function stopAndClose(sessionId: string): Promise<void> {
  await stopRoomRecordings(sessionId);
  await closeVideoRoom(sessionId);
}

export function closeVideoRoomAfter(sessionId: string): void {
  try {
    after(() => stopAndClose(sessionId));
  } catch {
    void stopAndClose(sessionId);
  }
}
