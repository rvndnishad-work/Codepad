/**
 * LiveKit plumbing for built-in video: join tokens and closing rooms.
 * Needs LIVEKIT_URL (wss://...), LIVEKIT_API_KEY and LIVEKIT_API_SECRET.
 * Server only.
 */
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export type LiveKitConfig = { url: string; apiKey: string; apiSecret: string };

export function liveKitConfig(): LiveKitConfig | null {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  return url && apiKey && apiSecret ? { url, apiKey, apiSecret } : null;
}

/** One LiveKit room per interview. */
export function videoRoomName(sessionId: string): string {
  return `interview-${sessionId}`;
}

/** Token lifetime. Long enough for an overrunning interview; the room closes when it ends. */
const TOKEN_TTL_SEC = 4 * 60 * 60;

export async function videoJoinToken(
  cfg: LiveKitConfig,
  p: { room: string; identity: string; name: string; metadata: Record<string, string> },
): Promise<string> {
  const at = new AccessToken(cfg.apiKey, cfg.apiSecret, { identity: p.identity, name: p.name, ttl: TOKEN_TTL_SEC, metadata: JSON.stringify(p.metadata) });
  at.addGrant({ roomJoin: true, room: p.room, canPublish: true, canSubscribe: true, canPublishData: false });
  return at.toJwt();
}

/** Ends the call for everyone, when the interview ends. Best effort. */
export async function closeVideoRoom(sessionId: string): Promise<void> {
  const cfg = liveKitConfig();
  if (!cfg) return;
  const host = cfg.url.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
  try {
    await new RoomServiceClient(host, cfg.apiKey, cfg.apiSecret).deleteRoom(videoRoomName(sessionId));
  } catch {
    // No one joined, or the room already closed.
  }
}
