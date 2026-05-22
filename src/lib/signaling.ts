/**
 * Utility for WebRTC signaling server URLs.
 * Resolves URLs from process.env.NEXT_PUBLIC_SIGNALING_URL.
 * Supports comma-separated strings for multiple custom signaling servers.
 */
export function getSignalingUrls(): string[] {
  const envUrl = process.env.NEXT_PUBLIC_SIGNALING_URL;
  if (envUrl) {
    return envUrl
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }

  // Fallbacks: local development and public Yjs signaling servers
  return [
    "ws://localhost:4444",
    "wss://signaling.yjs.dev",
  ];
}
